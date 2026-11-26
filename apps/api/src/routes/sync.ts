/**
 * Offline Sync Routes
 * Handle offline queue upload and conflict resolution
 */

import { Router } from "express";
import { z } from "zod";
import type { CountReasonCode, CustomerType, PaymentMethod } from "@prisma/client";
import { prisma } from "../index.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { branchScopeMiddleware } from "../middleware/rbac.js";
import { createAuditLog } from "../middleware/audit.js";
import { BUSINESS_RULES, OrderStatus } from "@wellspring/shared";

const router = Router();

// No branch scoping on sync - handled internally
// Auth required but we use optional auth to allow pre-sync checks

const offlineOperationSchema = z.object({
  type: z.enum(["SALE", "STOCK_COUNT", "STOCK_ADJUSTMENT", "TRANSFER"]),
  payload: z.record(z.unknown()),
  clientId: z.string().uuid(), // Unique ID from client for idempotency
  timestamp: z.string(), // ISO date
});

const syncRequestSchema = z.object({
  operations: z.array(offlineOperationSchema).min(1),
  lastSyncTimestamp: z.string().optional(),
});

type OfflineOperation = z.infer<typeof offlineOperationSchema>;
type SyncResult = {
  status: "success" | "conflict" | "error";
  serverId?: string;
  message?: string;
};
type OfflineSaleItem = {
  productId: string;
  batchId?: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
};

const CONFLICT_RESOLUTION = {
  SALE: "server_wins",           // Sales are idempotent - replay on server
  STOCK_COUNT: "client_wins",    // Most recent count wins
  STOCK_ADJUSTMENT: "server_wins", // Server has authoritative stock
  TRANSFER: "manual",            // Requires manual resolution
} as const;

// POST /api/sync/upload
router.post("/upload", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { operations, lastSyncTimestamp } = syncRequestSchema.parse(req.body);
  const branchId = req.user?.branchId!;
  const userId = req.user!.id;

  const results: Array<{ clientId: string; status: "success" | "conflict" | "error"; serverId?: string; message?: string }> = [];

  for (const op of operations) {
    try {
      let result: SyncResult;

      switch (op.type) {
        case "SALE":
          result = await processOfflineSale(op, branchId, userId);
          break;
        case "STOCK_COUNT":
          result = await processOfflineStockCount(op, branchId, userId);
          break;
        case "STOCK_ADJUSTMENT":
          result = await processOfflineStockAdjustment(op, branchId, userId);
          break;
        case "TRANSFER":
          result = await processOfflineTransfer(op, branchId, userId);
          break;
        default:
          result = { status: "error", message: "Unknown operation type" };
      }

      results.push({ clientId: op.clientId, ...result });
    } catch (err) {
      results.push({ clientId: op.clientId, status: "error", message: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  // Return new data since last sync
  const since = lastSyncTimestamp ? new Date(lastSyncTimestamp) : new Date(0);
  const [stockUpdates, productUpdates] = await Promise.all([
    prisma.stockLevel.findMany({ where: { branchId, lastUpdated: { gt: since } }, select: { productId: true, branchId: true, batchId: true, quantityOnHand: true, quantityAvailable: true, lastUpdated: true } }),
    prisma.product.findMany({ where: { updatedAt: { gt: since }, isActive: true }, select: { id: true, sku: true, name: true, standardPrice: true, isActive: true, updatedAt: true } }),
  ]);

  res.json({ success: true, data: { results, serverTimestamp: new Date().toISOString(), stockUpdates, productUpdates } });
}));

async function processOfflineSale(op: OfflineOperation, branchId: string, userId: string): Promise<SyncResult> {
  const payload = op.payload as {
    items: OfflineSaleItem[];
    paymentMethod: PaymentMethod;
    customerName?: string;
    customerType?: CustomerType;
    isOffline: boolean;
  };

  // Validate stock on server
  for (const item of payload.items) {
    const stock = await prisma.stockLevel.findFirst({
      where: { productId: item.productId, branchId, batchId: item.batchId ?? null },
      include: { product: true },
    });
    if (!stock || stock.quantityAvailable < item.quantity) {
      return { status: "conflict", message: `Insufficient stock for ${item.productId}` };
    }
  }

  // Recreate sale on server
  return prisma.$transaction(async (tx): Promise<SyncResult> => {
    const { subtotal, discountTotal, taxTotal, grandTotal } = calculateTotals(payload.items, payload.customerType);
    const sale = await tx.sale.create({
      data: {
        branchId, cashierId: userId, status: OrderStatus.DELIVERED,
        subtotal, discountTotal, taxTotal, grandTotal,
        paymentMethod: payload.paymentMethod,
        customerName: payload.customerName,
        customerType: payload.customerType,
        receiptNumber: `WS-OFL-${Date.now()}`,
        receiptSerial: `WS${new Date().toISOString().slice(0,10).replace(/-/g,"")}${Math.floor(Math.random()*10000).toString().padStart(4,"0")}`,
        isOffline: true, syncedAt: new Date(),
        items: {
          create: payload.items.map(i => ({
            productId: i.productId,
            batchId: i.batchId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discount: i.discount,
            taxRate: i.taxRate,
            lineTotal: i.unitPrice * i.quantity - i.discount * i.quantity + (i.unitPrice * i.quantity - i.discount * i.quantity) * i.taxRate,
          })),
        },
      },
    });

    for (const item of payload.items) {
      await tx.stockLevel.updateMany({
        where: { productId: item.productId, branchId, batchId: item.batchId ?? null },
        data: { quantityOnHand: { decrement: item.quantity }, quantityAvailable: { decrement: item.quantity } },
      });
    }

    return { status: "success", serverId: sale.id };
  });
}

async function processOfflineStockCount(op: OfflineOperation, branchId: string, userId: string): Promise<SyncResult> {
  const payload = op.payload as { productId: string; batchId: string | null; actualQuantity: number; reasonCode?: CountReasonCode; notes?: string };

  const stock = await prisma.stockLevel.findFirst({
    where: { productId: payload.productId, branchId, batchId: payload.batchId ?? null },
  });
  if (!stock) return { status: "error", message: "Stock record not found" };

  const variance = payload.actualQuantity - stock.quantityOnHand;
  const count = await prisma.stockCount.create({
    data: { branchId, productId: payload.productId, batchId: payload.batchId, systemQuantity: stock.quantityOnHand, actualQuantity: payload.actualQuantity, variance, reasonCode: payload.reasonCode, notes: payload.notes, countedBy: userId, countedAt: new Date(op.timestamp) },
  });

  await prisma.stockLevel.update({ where: { id: stock.id }, data: { quantityOnHand: payload.actualQuantity, quantityAvailable: payload.actualQuantity - stock.quantityCommitted } });

  return { status: "success", serverId: count.id };
}

async function processOfflineStockAdjustment(op: OfflineOperation, branchId: string, userId: string): Promise<SyncResult> {
  const payload = op.payload as { productId: string; batchId: string | null; newQuantity: number; reason: string };

  const stock = await prisma.stockLevel.findFirst({
    where: { productId: payload.productId, branchId, batchId: payload.batchId ?? null },
  });
  if (!stock) return { status: "error", message: "Stock record not found" };

  await prisma.stockLevel.update({ where: { id: stock.id }, data: { quantityOnHand: payload.newQuantity, quantityAvailable: payload.newQuantity - stock.quantityCommitted } });

  return { status: "success", message: "Adjustment applied" };
}

async function processOfflineTransfer(op: OfflineOperation, branchId: string, userId: string): Promise<SyncResult> {
  // Transfers require manual resolution if both branches edited offline
  return { status: "conflict", message: "Transfers require manual review after offline sync" };
}

function calculateTotals(items: OfflineSaleItem[], customerType?: CustomerType) {
  let subtotal = 0, discountTotal = 0, taxTotal = 0;
  for (const item of items) {
    const lineSubtotal = item.unitPrice * item.quantity;
    const lineDiscount = item.discount * item.quantity;
    const taxable = lineSubtotal - lineDiscount;
    subtotal += lineSubtotal; discountTotal += lineDiscount; taxTotal += taxable * item.taxRate;
  }
  let grandTotal = subtotal - discountTotal + taxTotal;
  if (customerType === "SENIOR" || customerType === "PWD") {
    const disc = grandTotal * 0.20; discountTotal += disc; grandTotal -= disc;
    taxTotal = (subtotal - discountTotal) * 0.12; grandTotal = subtotal - discountTotal + taxTotal;
  }
  return { subtotal, discountTotal, taxTotal, grandTotal: Math.round(grandTotal * 100) / 100 };
}

// GET /api/sync/status
router.get("/status", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const branchId = req.user?.branchId!;
  const pendingSales = await prisma.sale.count({ where: { branchId, isOffline: true, syncedAt: null } });
  const pendingCounts = await prisma.stockCount.count({ where: { branchId, approvedBy: null } });

  res.json({ success: true, data: { pendingOfflineSales: pendingSales, pendingStockCounts: pendingCounts, lastSync: null } });
}));

export default router;