/**
 * Inventory Routes
 * Stock levels, stock counts, transfers, reorder alerts
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { branchScopeMiddleware, rbacMiddleware } from "../middleware/rbac.js";
import { createAuditLog } from "../middleware/audit.js";
import { BUSINESS_RULES } from "@wellspring/shared";

const router = Router();

// Apply branch scoping to all routes
router.use(branchScopeMiddleware);

// ============ STOCK INQUIRY ============

// GET /api/inventory/stock
router.get("/stock", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { branchId, productId, categoryId, lowStock, nearExpiry, page = "1", limit = "50" } = req.query;

  const where: Record<string, unknown> = {};
  if (branchId) where.branchId = branchId;
  else if (req.user?.branchId) where.branchId = req.user.branchId;
  if (productId) where.productId = productId;

  const lowStockOnly = lowStock === "true";
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);
  const [stock, total] = await Promise.all([
    prisma.stockLevel.findMany({
      where,
      include: {
        product: { select: { id: true, sku: true, name: true, reorderPoint: true, safetyStock: true, isBatchTracked: true } },
        branch: { select: { id: true, code: true, name: true } },
        batch: { select: { id: true, batchNumber: true, expiryDate: true } },
      },
      orderBy: { lastUpdated: "desc" },
      ...(lowStockOnly ? {} : { skip, take }),
    }),
    lowStockOnly ? Promise.resolve(0) : prisma.stockLevel.count({ where }),
  ]);

  const filteredStock = lowStockOnly
    ? stock.filter(s => s.quantityAvailable <= s.product.reorderPoint)
    : stock;
  const pageStock = lowStockOnly ? filteredStock.slice(skip, skip + take) : filteredStock;

  // Add computed fields
  const data = pageStock.map(s => ({
    ...s,
    isLowStock: s.quantityAvailable <= s.product.reorderPoint,
    isNearExpiry: s.batch ? new Date(s.batch.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : false,
  }));

  res.json({
    success: true,
    data,
    meta: { page: Number(page), limit: take, total: lowStockOnly ? filteredStock.length : total },
  });
}));

// GET /api/inventory/stock/:productId/:branchId (detailed)
router.get("/stock/:productId/:branchId", asyncHandler(async (req, res) => {
  const levels = await prisma.stockLevel.findMany({
    where: { productId: req.params.productId, branchId: req.params.branchId },
    include: {
      batch: { select: { id: true, batchNumber: true, expiryDate: true, receivedDate: true } },
      product: { select: { reorderPoint: true, safetyStock: true, isBatchTracked: true } },
    },
    orderBy: { batch: { expiryDate: "asc" } },
  });
  res.json({ success: true, data: levels });
}));

// ============ STOCK COUNT ============

const stockCountSchema = z.object({
  productId: z.string().uuid(),
  batchId: z.string().uuid().nullable().optional(),
  actualQuantity: z.number().int(),
  reasonCode: z.enum(["DAMAGE", "THEFT", "EXPIRY", "MISCOUNT", "TRANSFER", "OTHER"]).optional(),
  notes: z.string().max(500).optional(),
});

router.post("/count", rbacMiddleware("inventory:count"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const data = stockCountSchema.parse(req.body);
  const branchId = (req.query.branchId as string | undefined) || req.user?.branchId;
  if (!branchId) throw HttpError.badRequest("Branch is required");

  const stock = await prisma.stockLevel.findFirst({
    where: { productId: data.productId, branchId, batchId: data.batchId ?? null },
    include: { product: true },
  });

  if (!stock) throw HttpError.notFound("Stock record not found");

  const variance = data.actualQuantity - stock.quantityOnHand;
  const tolerance = stock.product.isBatchTracked ? BUSINESS_RULES.FULL_COUNT_TOLERANCE_PCT : BUSINESS_RULES.STOCK_COUNT_TOLERANCE_PCT;
  const allowedVariance = Math.max(Math.ceil(stock.quantityOnHand * tolerance), 1);
  const exceedsTolerance = Math.abs(variance) > allowedVariance;

  const count = await prisma.stockCount.create({
    data: {
      branchId,
      productId: data.productId,
      batchId: data.batchId,
      systemQuantity: stock.quantityOnHand,
      actualQuantity: data.actualQuantity,
      variance,
      reasonCode: data.reasonCode,
      notes: data.notes,
      countedBy: req.user!.id,
      approvedBy: exceedsTolerance ? null : req.user!.id, // Auto-approve if within tolerance
      countedAt: new Date(),
    },
  });

  // If within tolerance, auto-adjust stock
  if (!exceedsTolerance) {
    await prisma.stockLevel.update({
      where: { id: stock.id },
      data: { quantityOnHand: data.actualQuantity, quantityAvailable: data.actualQuantity - stock.quantityCommitted, lastUpdated: new Date() },
    });
  }

  await createAuditLog(req.user!.id, req.user!.branchId, "STOCK_COUNT", "StockCount", count.id, null, count);

  res.status(201).json({ success: true, data: count, meta: { exceedsTolerance } });
}));

// GET /api/inventory/counts
router.get("/counts", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { branchId, productId, page = "1", limit = "50" } = req.query;
  const where: Record<string, unknown> = {};
  if (branchId) where.branchId = branchId;
  else if (req.user?.branchId) where.branchId = req.user.branchId;
  if (productId) where.productId = productId;

  const [counts, total] = await Promise.all([
    prisma.stockCount.findMany({
      where,
      include: { product: { select: { sku: true, name: true } }, branch: { select: { code: true, name: true } } },
      orderBy: { countedAt: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.stockCount.count({ where }),
  ]);
  res.json({ success: true, data: counts, meta: { page: Number(page), limit: Number(limit), total: Number(total) } });
}));

// ============ STOCK TRANSFER ============

const transferSchema = z.object({
  toBranchId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    batchId: z.string().uuid().nullable().optional(),
    quantity: z.number().int().positive(),
  })).min(1),
});

router.post("/transfers", rbacMiddleware("inventory:transfer"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const data = transferSchema.parse(req.body);
  const fromBranchId = (req.query.branchId as string | undefined) || req.user?.branchId;
  if (!fromBranchId) throw HttpError.badRequest("Source branch is required");

  if (fromBranchId === data.toBranchId) throw HttpError.badRequest("Cannot transfer to same branch");

  // Verify stock availability
  for (const item of data.items) {
    const stock = await prisma.stockLevel.findFirst({
      where: { productId: item.productId, branchId: fromBranchId, batchId: item.batchId ?? null },
    });
    if (!stock || stock.quantityAvailable < item.quantity) {
      throw HttpError.badRequest(`Insufficient stock for product ${item.productId}`);
    }
  }

  const transfer = await prisma.stockTransfer.create({
    data: {
      transferNumber: `TRF-${Date.now()}`,
      fromBranchId,
      toBranchId: data.toBranchId,
      requestedBy: req.user!.id,
      requestedAt: new Date(),
      items: { create: data.items },
    },
    include: { items: true },
  });

  await createAuditLog(req.user!.id, req.user!.branchId, "CREATE_TRANSFER", "StockTransfer", transfer.id);

  res.status(201).json({ success: true, data: transfer });
}));

router.get("/transfers", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { branchId, status, page = "1", limit = "50" } = req.query;
  const where: Record<string, unknown> = {};
  if (branchId) where.fromBranchId = branchId;
  if (status) where.status = status;

  const [transfers, total] = await Promise.all([
    prisma.stockTransfer.findMany({
      where,
      include: { fromBranch: { select: { code: true, name: true } }, toBranch: { select: { code: true, name: true } }, items: true },
      orderBy: { requestedAt: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.stockTransfer.count({ where }),
  ]);
  res.json({ success: true, data: transfers, meta: { page: Number(page), limit: Number(limit), total: Number(total) } });
}));

// POST /api/inventory/transfers/:id/approve
router.post("/transfers/:id/approve", rbacMiddleware("inventory:transfer"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const transfer = await prisma.stockTransfer.findUnique({ where: { id: req.params.id } });
  if (!transfer) throw HttpError.notFound("Transfer not found");
  if (transfer.status !== "PENDING") throw HttpError.badRequest("Transfer not pending");

  await prisma.stockTransfer.update({
    where: { id: req.params.id },
    data: { status: "APPROVED", approvedBy: req.user!.id, approvedAt: new Date() },
  });

  res.json({ success: true, message: "Transfer approved" });
}));

// POST /api/inventory/transfers/:id/ship
router.post("/transfers/:id/ship", rbacMiddleware("inventory:transfer"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const transfer = await prisma.stockTransfer.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  });
  if (!transfer) throw HttpError.notFound("Transfer not found");
  if (transfer.status !== "APPROVED") throw HttpError.badRequest("Transfer not approved");

  // Decrement source branch stock
  for (const item of transfer.items) {
    await prisma.stockLevel.updateMany({
      where: { productId: item.productId, branchId: transfer.fromBranchId, batchId: item.batchId ?? null },
      data: { quantityOnHand: { decrement: item.quantity }, quantityAvailable: { decrement: item.quantity } },
    });
  }

  await prisma.stockTransfer.update({
    where: { id: req.params.id },
    data: { status: "SHIPPED", shippedBy: req.user!.id, shippedAt: new Date() },
  });

  res.json({ success: true, message: "Transfer shipped" });
}));

// POST /api/inventory/transfers/:id/receive
router.post("/transfers/:id/receive", rbacMiddleware("inventory:transfer"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const transfer = await prisma.stockTransfer.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  });
  if (!transfer) throw HttpError.notFound("Transfer not found");
  if (transfer.status !== "SHIPPED") throw HttpError.badRequest("Transfer not shipped");

  // Increment destination branch stock
  for (const item of transfer.items) {
    const stockKey = {
      productId: item.productId,
      branchId: transfer.toBranchId,
      batchId: item.batchId ?? null,
    };
    const stock = await prisma.stockLevel.findFirst({ where: stockKey });

    if (stock) {
      await prisma.stockLevel.update({
        where: { id: stock.id },
        data: { quantityOnHand: { increment: item.quantity }, quantityAvailable: { increment: item.quantity } },
      });
    } else {
      await prisma.stockLevel.create({
        data: { ...stockKey, quantityOnHand: item.quantity, quantityAvailable: item.quantity },
      });
    }
  }

  await prisma.stockTransfer.update({
    where: { id: req.params.id },
    data: { status: "RECEIVED", receivedBy: req.user!.id, receivedAt: new Date() },
  });

  res.json({ success: true, message: "Transfer received" });
}));

// ============ REORDER ALERTS ============

router.get("/reorder-alerts", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { branchId } = req.query;
  const whereBranch = ((branchId as string | undefined) || req.user?.branchId) ?? undefined;

  // Get products below reorder point
  const stock = await prisma.stockLevel.findMany({
    where: {
      branchId: whereBranch,
      product: { isActive: true },
    },
    include: { product: { select: { sku: true, name: true, reorderPoint: true, safetyStock: true } }, branch: { select: { code: true, name: true } } },
  });
  const lowStock = stock.filter(s => s.quantityAvailable <= s.product.reorderPoint);

  res.json({ success: true, data: lowStock });
}));

export default router;