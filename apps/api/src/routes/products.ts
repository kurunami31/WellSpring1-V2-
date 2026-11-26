/**
 * Product Management Routes
 * CRUD for products, categories, batches
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { branchScopeMiddleware } from "../middleware/rbac.js";

const router = Router();

const createProductSchema = z.object({
  sku: z.string().min(1).max(50),
  barcode: z.string().max(50).optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  categoryId: z.string().uuid(),
  unitOfMeasure: z.string().max(20),
  standardPrice: z.number().positive(),
  costPrice: z.number().positive(),
  isPrescriptionOnly: z.boolean().default(false),
  isControlledDrug: z.boolean().default(false),
  isBatchTracked: z.boolean().default(true),
  reorderPoint: z.number().int().nonnegative().default(10),
  safetyStock: z.number().int().nonnegative().default(5),
});

const updateProductSchema = createProductSchema.partial();

// GET /api/products
router.get("/", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page = "1", limit = "50", categoryId, isActive, search, branchId } = req.query;

  const where: Record<string, unknown> = {};
  if (categoryId) where.categoryId = categoryId;
  if (isActive !== undefined) where.isActive = isActive === "true";
  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: "insensitive" } },
      { sku: { contains: search as string, mode: "insensitive" } },
      { barcode: { contains: search as string, mode: "insensitive" } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.product.count({ where }),
  ]);

  res.json({
    success: true,
    data: products,
    meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
  });
}));

// GET /api/products/:id
router.get("/:id", asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: {
      category: { select: { id: true, name: true } },
      batches: { where: { expiryDate: { gte: new Date() } }, orderBy: { expiryDate: "asc" } },
      stockLevels: { include: { branch: { select: { id: true, code: true, name: true } } } },
    },
  });
  if (!product) throw HttpError.notFound("Product not found");
  res.json({ success: true, data: product });
}));

// POST /api/products
router.post("/", asyncHandler(async (req, res) => {
  const data = createProductSchema.parse(req.body);

  const [skuExists, barcodeExists] = await Promise.all([
    prisma.product.findUnique({ where: { sku: data.sku } }),
    data.barcode ? prisma.product.findUnique({ where: { barcode: data.barcode } }) : Promise.resolve(null),
  ]);
  if (skuExists) throw HttpError.conflict("SKU already exists");
  if (barcodeExists) throw HttpError.conflict("Barcode already exists");

  const product = await prisma.product.create({ data });
  res.status(201).json({ success: true, data: product });
}));

// PATCH /api/products/:id
router.patch("/:id", asyncHandler(async (req, res) => {
  const data = updateProductSchema.parse(req.body);

  if (data.sku) {
    const existing = await prisma.product.findFirst({ where: { sku: data.sku, NOT: { id: req.params.id } } });
    if (existing) throw HttpError.conflict("SKU already exists");
  }
  if (data.barcode) {
    const existing = await prisma.product.findFirst({ where: { barcode: data.barcode, NOT: { id: req.params.id } } });
    if (existing) throw HttpError.conflict("Barcode already exists");
  }

  const product = await prisma.product.update({
    where: { id: req.params.id },
    data,
  });
  res.json({ success: true, data: product });
}));

// DELETE /api/products/:id (soft delete)
router.delete("/:id", asyncHandler(async (req, res) => {
  await prisma.product.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  res.json({ success: true, message: "Product deactivated" });
}));

// ============ CATEGORIES ============
router.get("/categories/all", asyncHandler(async (_req, res) => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  res.json({ success: true, data: categories });
}));

export default router;