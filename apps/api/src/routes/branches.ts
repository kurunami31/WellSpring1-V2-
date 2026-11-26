/**
 * Branch Management Routes
 * Admin only - CRUD for branches
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

const createBranchSchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(100),
  address: z.string().max(255),
  phone: z.string().max(20).optional(),
});

const updateBranchSchema = createBranchSchema.partial();

// GET /api/branches
router.get("/", asyncHandler(async (_req, res) => {
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
  });
  res.json({ success: true, data: branches });
}));

// GET /api/branches/:id
router.get("/:id", asyncHandler(async (req, res) => {
  const branch = await prisma.branch.findUnique({
    where: { id: req.params.id },
    include: {
      _count: { select: { users: true, sales: true, purchaseOrders: true, stockLevels: true } },
    },
  });
  if (!branch) throw HttpError.notFound("Branch not found");
  res.json({ success: true, data: branch });
}));

// POST /api/branches
router.post("/", asyncHandler(async (req, res) => {
  const data = createBranchSchema.parse(req.body);

  const existing = await prisma.branch.findUnique({ where: { code: data.code } });
  if (existing) throw HttpError.conflict("Branch code already exists");

  const branch = await prisma.branch.create({ data });
  res.status(201).json({ success: true, data: branch });
}));

// PATCH /api/branches/:id
router.patch("/:id", asyncHandler(async (req, res) => {
  const data = updateBranchSchema.parse(req.body);

  if (data.code) {
    const existing = await prisma.branch.findFirst({
      where: { code: data.code, NOT: { id: req.params.id } },
    });
    if (existing) throw HttpError.conflict("Branch code already exists");
  }

  const branch = await prisma.branch.update({
    where: { id: req.params.id },
    data,
  });
  res.json({ success: true, data: branch });
}));

// DELETE /api/branches/:id (soft delete)
router.delete("/:id", asyncHandler(async (req, res) => {
  await prisma.branch.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  res.json({ success: true, message: "Branch deactivated" });
}));

export default router;