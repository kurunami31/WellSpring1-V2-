/**
 * Purchasing & Supplier Routes
 * Suppliers, POs, GRNs, Invoice Matching
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { branchScopeMiddleware, rbacAnyMiddleware, rbacMiddleware } from "../middleware/rbac.js";
import { createAuditLog } from "../middleware/audit.js";
import { BUSINESS_RULES, POStatus, GRNStatus } from "@wellspring/shared";

const router = Router();
router.use(branchScopeMiddleware);

// ============ SUPPLIERS ============

const supplierSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  contactPerson: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(255).optional(),
  paymentTerms: z.string().max(50).optional(),
  leadTimeDays: z.number().int().nonnegative().default(7),
});

router.get("/suppliers", rbacMiddleware("purchasing:read"), asyncHandler(async (req, res) => {
  const { page = "1", limit = "50", isActive } = req.query;
  const where: Record<string, unknown> = {};
  if (isActive !== undefined) where.isActive = isActive === "true";

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({ where, orderBy: { name: "asc" }, skip: (Number(page)-1)*Number(limit), take: Number(limit) }),
    prisma.supplier.count({ where }),
  ]);
  res.json({ success: true, data: suppliers, meta: { page: Number(page), limit: Number(limit), total: Number(total) } });
}));

router.get("/suppliers/:id", rbacMiddleware("purchasing:read"), asyncHandler(async (req, res) => {
  const supplier = await prisma.supplier.findUnique({
    where: { id: req.params.id },
    include: { purchaseOrders: { take: 5, orderBy: { orderDate: "desc" } } },
  });
  if (!supplier) throw HttpError.notFound("Supplier not found");
  res.json({ success: true, data: supplier });
}));

router.post("/suppliers", rbacMiddleware("supplier:manage"), asyncHandler(async (req, res) => {
  const data = supplierSchema.parse(req.body);
  if (await prisma.supplier.findUnique({ where: { code: data.code } })) throw HttpError.conflict("Supplier code exists");
  const supplier = await prisma.supplier.create({ data });
  res.status(201).json({ success: true, data: supplier });
}));

router.patch("/suppliers/:id", rbacMiddleware("supplier:manage"), asyncHandler(async (req, res) => {
  const data = supplierSchema.partial().parse(req.body);
  const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data });
  res.json({ success: true, data: supplier });
}));

router.delete("/suppliers/:id", rbacMiddleware("supplier:manage"), asyncHandler(async (req, res) => {
  await prisma.supplier.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ success: true, message: "Supplier deactivated" });
}));

// ============ PURCHASE ORDERS ============

const poItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitCost: z.number().positive(),
  taxRate: z.number().nonnegative().default(0.12),
});

const createPOSchema = z.object({
  supplierId: z.string().uuid(),
  branchId: z.string().uuid(),
  expectedDate: z.string().optional(),
  items: z.array(poItemSchema).min(1),
  notes: z.string().max(1000).optional(),
});

router.get("/purchase-orders", rbacMiddleware("purchasing:read"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { branchId, supplierId, status, page = "1", limit = "50" } = req.query;
  const where: Record<string, unknown> = {};
  if (branchId) where.branchId = branchId;
  else if (req.user?.branchId) where.branchId = req.user.branchId;
  if (supplierId) where.supplierId = supplierId;
  if (status) where.status = status;

  const [pos, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: { supplier: { select: { id: true, code: true, name: true } }, branch: { select: { code: true, name: true } } },
      orderBy: { orderDate: "desc" },
      skip: (Number(page)-1)*Number(limit),
      take: Number(limit),
    }),
    prisma.purchaseOrder.count({ where }),
  ]);
  res.json({ success: true, data: pos, meta: { page: Number(page), limit: Number(limit), total: Number(total) } });
}));

router.get("/purchase-orders/:id", rbacMiddleware("purchasing:read"), asyncHandler(async (req, res) => {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { product: { select: { sku: true, name: true } } } }, supplier: true, branch: true, grns: true },
  });
  if (!po) throw HttpError.notFound("PO not found");
  res.json({ success: true, data: po });
}));

router.post("/purchase-orders", rbacMiddleware("purchasing:create_po"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const data = createPOSchema.parse(req.body);
  const branchId = (req.query.branchId as string | undefined) || data.branchId;
  if (branchId !== data.branchId) throw HttpError.forbidden("Cannot create a PO for another branch");

  const poNumber = `PO-${Date.now()}`;
  const subtotal = data.items.reduce((s, i) => s + i.unitCost * i.quantity, 0);
  const taxTotal = data.items.reduce((s, i) => s + (i.unitCost * i.quantity * i.taxRate), 0);
  const grandTotal = subtotal + taxTotal;

  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      supplierId: data.supplierId,
      branchId,
      orderDate: new Date(),
      expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
      subtotal, taxTotal, grandTotal,
      notes: data.notes,
      createdBy: req.user!.id,
      items: {
        create: data.items.map(i => ({
          productId: i.productId,
          quantityOrdered: i.quantity,
          unitCost: i.unitCost,
          taxRate: i.taxRate,
          lineTotal: i.unitCost * i.quantity * (1 + i.taxRate),
        })),
      },
    },
    include: { items: { include: { product: { select: { sku: true, name: true } } } } },
  });

  await createAuditLog(req.user!.id, req.user!.branchId, "CREATE_PO", "PurchaseOrder", po.id);
  res.status(201).json({ success: true, data: po });
}));

router.post("/purchase-orders/:id/send", rbacMiddleware("purchasing:create_po"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
  if (!po) throw HttpError.notFound("PO not found");
  if (po.status !== POStatus.DRAFT) throw HttpError.badRequest("Only draft POs can be sent");

  await prisma.purchaseOrder.update({
    where: { id: req.params.id },
    data: { status: POStatus.SENT },
  });
  res.json({ success: true, message: "PO sent to supplier" });
}));

// ============ GOODS RECEIVED NOTES ============

const grnItemSchema = z.object({
  poItemId: z.string().uuid(),
  productId: z.string().uuid(),
  batchNumber: z.string().min(1).max(50),
  expiryDate: z.string(), // ISO date
  quantityReceived: z.number().int().positive(),
  unitCost: z.number().positive(),
  qualityCheck: z.enum(["PASSED", "FAILED", "PENDING"]).default("PENDING"),
  notes: z.string().max(500).optional(),
});

const createGRNSchema = z.object({
  poId: z.string().uuid(),
  branchId: z.string().uuid(),
  supplierId: z.string().uuid(),
  items: z.array(grnItemSchema).min(1),
  notes: z.string().max(1000).optional(),
});

router.post("/grns", rbacMiddleware("purchasing:grn"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const data = createGRNSchema.parse(req.body);
  const branchId = (req.query.branchId as string | undefined) || data.branchId;
  if (branchId !== data.branchId) throw HttpError.forbidden("Cannot create a GRN for another branch");
  const grnNumber = `GRN-${Date.now()}`;

  const grn = await prisma.$transaction(async (tx) => {
    const grn = await tx.gRN.create({
      data: {
        grnNumber,
        poId: data.poId,
        branchId: data.branchId,
        supplierId: data.supplierId,
        receivedBy: req.user!.id,
        receivedDate: new Date(),
        notes: data.notes,
        items: { create: data.items.map(i => ({ ...i, expiryDate: new Date(i.expiryDate) })) },
      },
      include: { items: true },
    });

    // Update PO received quantities
    for (const item of data.items) {
      await tx.pOItem.update({
        where: { id: item.poItemId },
        data: { quantityReceived: { increment: item.quantityReceived } },
      });
    }

    // Check if PO fully received
    const po = await tx.purchaseOrder.findUnique({
      where: { id: data.poId },
      include: { items: true },
    });
    const fullyReceived = po!.items.every(i => i.quantityReceived >= i.quantityOrdered);
    if (fullyReceived) {
      await tx.purchaseOrder.update({ where: { id: data.poId }, data: { status: POStatus.RECEIVED } });
    } else {
      await tx.purchaseOrder.update({ where: { id: data.poId }, data: { status: POStatus.PARTIAL } });
    }

    return grn;
  });

  await createAuditLog(req.user!.id, req.user!.branchId, "CREATE_GRN", "GRN", grn.id);
  res.status(201).json({ success: true, data: grn });
}));

router.get("/grns", rbacAnyMiddleware("purchasing:read", "purchasing:grn"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { branchId, poId, status, page = "1", limit = "50" } = req.query;
  const where: Record<string, unknown> = {};
  if (branchId) where.branchId = branchId;
  else if (req.user?.branchId) where.branchId = req.user.branchId;
  if (poId) where.poId = poId;
  if (status) where.status = status;

  const [grns, total] = await Promise.all([
    prisma.gRN.findMany({
      where,
      include: { po: { select: { poNumber: true } }, supplier: { select: { name: true } }, branch: { select: { code: true } } },
      orderBy: { receivedDate: "desc" },
      skip: (Number(page)-1)*Number(limit),
      take: Number(limit),
    }),
    prisma.gRN.count({ where }),
  ]);
  res.json({ success: true, data: grns, meta: { page: Number(page), limit: Number(limit), total: Number(total) } });
}));

// ============ INVOICE MATCHING ============

router.post("/invoice-match", rbacMiddleware("purchasing:invoice_match"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { grnId, invoiceNumber, invoiceDate, items } = req.body; // items: { grnItemId, invoiceQuantity, invoiceUnitCost }[]

  const grn = await prisma.gRN.findUnique({ where: { id: grnId }, include: { items: true, po: true } });
  if (!grn) throw HttpError.notFound("GRN not found");

  // 3-way match logic
  const results = items.map((invItem: { grnItemId: string; invoiceQuantity: number; invoiceUnitCost: number }) => {
    const grnItem = grn.items.find(i => i.id === invItem.grnItemId);
    if (!grnItem) return { grnItemId: invItem.grnItemId, matched: false, reason: "GRN item not found" };

    const qtyMatch = grnItem.quantityReceived === invItem.invoiceQuantity;
    const priceMatch = Math.abs(Number(grnItem.unitCost) - invItem.invoiceUnitCost) <= Number(grnItem.unitCost) * 0.01;

    return { grnItemId: invItem.grnItemId, matched: qtyMatch && priceMatch, qtyMatch, priceMatch };
  });

  const allMatched = results.every((r: { matched: boolean }) => r.matched);

  if (allMatched) {
    // Create payable record (simplified - would push to accounting in real impl)
    await createAuditLog(req.user!.id, req.user!.branchId, "INVOICE_MATCHED", "GRN", grnId, null, { invoiceNumber, invoiceDate });
    res.json({ success: true, data: { matched: true, message: "3-way match successful" } });
  } else {
    res.json({ success: true, data: { matched: false, results, message: "Mismatches found" } });
  }
}));

export default router;