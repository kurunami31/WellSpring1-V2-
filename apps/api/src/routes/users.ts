/**
 * User Management Routes
 * Admin only - create, read, update, deactivate users
 */

import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../index.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { UserRole, ROLE_HIERARCHY } from "@wellspring/shared";
import { AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(100),
  role: z.nativeEnum(UserRole),
  branchId: z.string().uuid().nullable().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.nativeEnum(UserRole).optional(),
  branchId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/users
router.get("/", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page = "1", limit = "20", role, branchId, isActive, search } = req.query;

  const where: Record<string, unknown> = {};
  if (role) where.role = role;
  if (branchId) where.branchId = branchId;
  if (isActive !== undefined) where.isActive = isActive === "true";
  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: "insensitive" } },
      { email: { contains: search as string, mode: "insensitive" } },
    ];
  }

  // Branch scoping
  if (req.user?.role !== "SYSTEM_ADMIN" && req.user?.role !== "HEAD_OFFICE_MANAGER") {
    where.branchId = req.user!.branchId;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, email: true, name: true, role: true, branchId: true,
        isActive: true, lastLogin: true, createdAt: true,
        branch: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    data: users,
    meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
  });
}));

// GET /api/users/:id
router.get("/:id", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, email: true, name: true, role: true, branchId: true,
      isActive: true, lastLogin: true, createdAt: true,
      branch: { select: { id: true, code: true, name: true } },
    },
  });

  if (!user) throw HttpError.notFound("User not found");

  // Branch check
  if (req.user?.role !== "SYSTEM_ADMIN" && req.user?.role !== "HEAD_OFFICE_MANAGER") {
    if (user.branchId !== req.user!.branchId) throw HttpError.forbidden();
  }

  res.json({ success: true, data: user });
}));

// POST /api/users
router.post("/", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const data = createUserSchema.parse(req.body);

  // Check if requester can create this role
  if (req.user?.role !== "SYSTEM_ADMIN") {
    const requesterLevel = ROLE_HIERARCHY[req.user!.role];
    const targetLevel = ROLE_HIERARCHY[data.role];
    if (targetLevel >= requesterLevel) {
      throw HttpError.forbidden("Cannot create user with equal or higher role");
    }
  }

  // Check email uniqueness
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw HttpError.conflict("Email already registered");

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name,
      role: data.role,
      branchId: data.branchId || req.user?.branchId,
    },
    select: { id: true, email: true, name: true, role: true, branchId: true, isActive: true, createdAt: true },
  });

  res.status(201).json({ success: true, data: user });
}));

// PATCH /api/users/:id
router.patch("/:id", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const data = updateUserSchema.parse(req.body);

  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) throw HttpError.notFound("User not found");

  // Permission checks
  if (req.user?.role !== "SYSTEM_ADMIN") {
    if (target.branchId !== req.user!.branchId) throw HttpError.forbidden();
    if (data.role) {
      const requesterLevel = ROLE_HIERARCHY[req.user!.role];
      const targetLevel = ROLE_HIERARCHY[data.role];
      if (targetLevel >= requesterLevel) throw HttpError.forbidden("Cannot assign equal or higher role");
    }
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: { id: true, email: true, name: true, role: true, branchId: true, isActive: true, updatedAt: true },
  });

  res.json({ success: true, data: user });
}));

// DELETE /api/users/:id (soft delete - deactivate)
router.delete("/:id", asyncHandler(async (req: AuthenticatedRequest, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) throw HttpError.notFound("User not found");

  if (req.user?.role !== "SYSTEM_ADMIN" && target.branchId !== req.user?.branchId) {
    throw HttpError.forbidden();
  }

  await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });

  res.json({ success: true, message: "User deactivated" });
}));

export default router;