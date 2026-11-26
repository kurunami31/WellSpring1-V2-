/**
 * Sales / POS Routes
 * Process sales, voids, refunds, receipts
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { branchScopeMiddleware, rbacMiddleware } from "../middleware/rbac.js";
import { createAuditLog } from "../middleware/audit.js";
import { BUSINESS_RULES, PaymentMethod, OrderStatus } from "@wellspring/shared";

const router = Router();
router.use(branchScopeMiddleware);

// ============ SCHEMAS ============

const saleItemSchema = z.object({
  productId: z.string().uuid(),
  batchId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  discount: z.number().nonnegative().default(0),
  taxRate: z.number().nonnegative().default(0.12),
  isPrescription: z.boolean().default(false),
  prescriptionId: z.string().uuid().nullable().optional(),
});

const createSaleSchema = z.object({
  items: z.array(saleItemSchema).min(1),
  paymentMethod: z.nativeEnum(PaymentMethod),
  paymentReference: z.string().max(100).optional(),
  customerName: z.string().max(100).optional(),
  customerType: z.enum(["REGULAR", "SENIOR", "PWD", "LOYALTY"]).optional(),
  loyaltyPointsRedeemed: z.number().int().default(0),
  isOffline: z.boolean().default(false),
});

const voidRefundSchema = z.object({
  reason: z.string().min(1).max(200),
});

// ============ HELPERS ============

function generateReceiptSerial(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `${BUSINESS_RULES.RECEIPT_SERIAL_PREFIX}${date}${rand}`;
}

function calculateTotals(items: typeof createSaleSchema._type.items, customerType?: string) {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  for (const item of items) {
    const lineSubtotal = item.unitPrice * item.quantity;
    const lineDiscount = item.discount * item.quantity;
    const taxable = lineSubtotal - lineDiscount;
    const tax = taxable * item.taxRate;

    subtotal += lineSubtotal;
    discountTotal += lineDiscount;
    taxTotal += tax;
  }

  let grandTotal = subtotal - discountTotal + taxTotal;

  // Apply SC/PWD discount (20% VAT-exempt)
  if (customerType === "SENIOR" || customerType === "PWD") {
    const discount = grandTotal * BUSINESS_RULES.SC_PWD_DISCOUNT_RATE;
    discountTotal += discount;
    grandTotal -= discount;
    // VAT is computed on discounted amount
    taxTotal = (subtotal - discountTotal) * 0.12;
    grandTotal = subtotal - discountTotal + taxTotal;
  }

  return { subtotal, discountTotal, taxTotal, grandTotal: Math.round(grandTotal * 100) / 100 };
}

// ============ CREATE SALE ============

router.post("/", rbacMiddleware("sales:create"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const data = createSaleSchema.parse(req.body);
  const branchId = (req.query.branchId as string | undefined) || req.user!.branchId;
  if (!branchId) throw HttpError.badRequest("Branch is required");

  // Validate stock and batch availability
  for (const item of data.items) {
    const stock = await prisma.stockLevel.findFirst({
      where: { productId: item.productId, branchId, batchId: item.batchId ?? null },
      include: { product: true, batch: true },
    });

    if (!stock) throw HttpError.badRequest(`Product not available at this branch`);

    // Check prescription
    if (stock.product.isPrescriptionOnly && !item.isPrescription) {
      throw HttpError.badRequest(`Prescription required for ${stock.product.name}`);
    }

    // Check batch expiry
    if (stock.batch && new Date(stock.batch.expiryDate) <= new Date()) {
      throw HttpError.badRequest(`Batch ${stock.batch.batchNumber} has expired`);
    }

    // Check stock availability
    if (stock.quantityAvailable < item.quantity) {
      throw HttpError.badRequest(`Insufficient stock for ${stock.product.sku} (available: ${stock.quantityAvailable})`);
    }
  }

  // Calculate totals
  const { subtotal, discountTotal, taxTotal, grandTotal } = calculateTotals(data.items, data.customerType);

  // Generate receipt serial
  const receiptSerial = generateReceiptSerial();
  const receiptNumber = `WS-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;

  // Create sale in transaction
  const sale = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        branchId,
        cashierId: req.user!.id,
        status: OrderStatus.DELIVERED,
        subtotal,
        discountTotal,
        taxTotal,
        grandTotal,
        paymentMethod: data.paymentMethod,
        paymentReference: data.paymentReference,
        customerName: data.customerName,
        customerType: data.customerType,
        loyaltyPointsRedeemed: data.loyaltyPointsRedeemed,
        loyaltyPointsEarned: Math.floor(grandTotal / 10), // 1 point per 10 PHP
        receiptNumber,
        receiptSerial,
        isOffline: data.isOffline,
        syncedAt: data.isOffline ? null : new Date(),
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            batchId: item.batchId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            taxRate: item.taxRate,
            lineTotal: (item.unitPrice * item.quantity) - (item.discount * item.quantity) + ((item.unitPrice * item.quantity - item.discount * item.quantity) * item.taxRate),
            isPrescription: item.isPrescription,
            prescriptionId: item.prescriptionId,
          })),
        },
      },
      include: { items: { include: { product: { select: { sku: true, name: true } } } } },
    });

    // Decrement stock (FEFO - handled by batchId)
    for (const item of data.items) {
      await tx.stockLevel.updateMany({
        where: { productId: item.productId, branchId, batchId: item.batchId ?? null },
        data: { quantityOnHand: { decrement: item.quantity }, quantityAvailable: { decrement: item.quantity } },
      });

      // Create stock movement record
      await tx.auditLog.create({
        data: {
          userId: req.user!.id,
          branchId,
          action: "STOCK_DECREMENT_SALE",
          entityType: "StockLevel",
          entityId: item.productId,
          before: { quantity: item.quantity },
          after: { quantity: -item.quantity },
        },
      });
    }

    return sale;
  });

  await createAuditLog(req.user!.id, branchId, "CREATE_SALE", "Sale", sale.id, null, sale);

  res.status(201).json({ success: true, data: sale });
}));

// ============ GET SALES ============

router.get("/", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { branchId, cashierId, status, startDate, endDate, page = "1", limit = "50" } = req.query;
  const where: Record<string, unknown> = {};

  if (branchId) where.branchId = branchId;
  else if (req.user?.branchId) where.branchId = req.user.branchId;
  if (cashierId) where.cashierId = cashierId;
  if (status) where.status = status;
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: new Date(startDate as string) } : {}),
      ...(endDate ? { lte: new Date(endDate as string) } : {}),
    };
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: { items: { include: { product: { select: { sku: true, name: true } } } }, cashier: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.sale.count({ where }),
  ]);

  res.json({ success: true, data: sales, meta: { page: Number(page), limit: Number(limit), total: Number(total) } });
}));

// GET /api/sales/:id
router.get("/:id", asyncHandler(async (req, res) => {
  const sale = await prisma.sale.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { product: { select: { sku: true, name: true } } } }, cashier: { select: { name: true } }, branch: { select: { code: true, name: true } } },
  });
  if (!sale) throw HttpError.notFound("Sale not found");
  res.json({ success: true, data: sale });
}));

// ============ VOID SALE ============

router.post("/:id/void", rbacMiddleware("sales:void"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const data = voidRefundSchema.parse(req.body);
  const sale = await prisma.sale.findUnique({ where: { id: req.params.id }, include: { items: true } });

  if (!sale) throw HttpError.notFound("Sale not found");
  if (sale.status !== OrderStatus.DELIVERED) throw HttpError.badRequest("Only completed sales can be voided");
  if (sale.isOffline && !sale.syncedAt) throw HttpError.badRequest("Cannot void unsynced offline sale");

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id: sale.id },
      data: { status: OrderStatus.CANCELLED },
    });

    // Restore stock
    for (const item of sale.items) {
      await tx.stockLevel.updateMany({
        where: { productId: item.productId, branchId: sale.branchId, batchId: item.batchId ?? null },
        data: { quantityOnHand: { increment: item.quantity }, quantityAvailable: { increment: item.quantity } },
      });
    }

    await tx.auditLog.create({
      data: { userId: req.user!.id, branchId: sale.branchId, action: "VOID_SALE", entityType: "Sale", entityId: sale.id, before: sale, after: { status: "CANCELLED", reason: data.reason } },
    });
  });

  res.json({ success: true, message: "Sale voided" });
}));

// ============ REFUND ============

router.post("/:id/refund", rbacMiddleware("sales:refund"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const data = voidRefundSchema.parse(req.body);
  const sale = await prisma.sale.findUnique({ where: { id: req.params.id }, include: { items: true } });

  if (!sale) throw HttpError.notFound("Sale not found");
  if (sale.status !== OrderStatus.DELIVERED) throw HttpError.badRequest("Only completed sales can be refunded");

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id: sale.id },
      data: { status: OrderStatus.REFUNDED },
    });

    // Restore stock
    for (const item of sale.items) {
      await tx.stockLevel.updateMany({
        where: { productId: item.productId, branchId: sale.branchId, batchId: item.batchId ?? null },
        data: { quantityOnHand: { increment: item.quantity }, quantityAvailable: { increment: item.quantity } },
      });
    }

    await tx.auditLog.create({
      data: { userId: req.user!.id, branchId: sale.branchId, action: "REFUND_SALE", entityType: "Sale", entityId: sale.id, before: sale, after: { status: "REFUNDED", reason: data.reason } },
    });
  });

  res.json({ success: true, message: "Refund processed" });
}));

// ============ RECEIPT REPRINT ============

router.get("/:id/receipt", asyncHandler(async (req, res) => {
  const sale = await prisma.sale.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { product: { select: { sku: true, name: true } } } }, branch: true, cashier: { select: { name: true } } },
  });
  if (!sale) throw HttpError.notFound("Sale not found");

  // Generate receipt data
  const receipt = {
    header: {
      company: "WellSpring Pharmacy & Retail Corp.",
      branch: sale.branch,
      tin: "000-000-000-000",
      address: sale.branch.address,
      min: "123456789",
      serial: sale.receiptSerial,
    },
    sale: {
      receiptNumber: sale.receiptNumber,
      date: sale.createdAt,
      cashier: sale.cashier.name,
      customer: sale.customerName || "Walk-in",
      customerType: sale.customerType,
      paymentMethod: sale.paymentMethod,
      paymentReference: sale.paymentReference,
    },
    items: sale.items.map(i => ({
      name: i.product.name,
      qty: i.quantity,
      price: i.unitPrice,
      discount: i.discount,
      total: i.lineTotal,
    })),
    totals: { subtotal: sale.subtotal, discount: sale.discountTotal, tax: sale.taxTotal, grandTotal: sale.grandTotal },
    vatBreakdown: {
      vatable: Number(sale.subtotal) - Number(sale.discountTotal),
      vatExempt: sale.customerType === "SENIOR" || sale.customerType === "PWD" ? Number(sale.grandTotal) * 0.2 : 0,
      vatAmount: sale.taxTotal,
    },
    footer: "Thank you for shopping at WellSpring!",
  };

  res.json({ success: true, data: receipt });
}));

export default router;