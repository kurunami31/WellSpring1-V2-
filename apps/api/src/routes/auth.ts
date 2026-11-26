/**
 * Authentication Routes
 * Login, logout, token refresh, password change
 */

import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../index.js";
import { generateToken, AuthenticatedRequest, authMiddleware } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { UserRole } from "@wellspring/shared";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

// POST /api/auth/login
router.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, passwordHash: true, role: true, branchId: true, isActive: true },
  });

  if (!user || !user.isActive) {
    throw HttpError.unauthorized("Invalid credentials");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw HttpError.unauthorized("Invalid credentials");
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  const tokenUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    branchId: user.branchId,
  };

  const token = generateToken(tokenUser);

  res.json({
    success: true,
    data: {
      user: tokenUser,
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || "8h",
    },
  });
}));

// POST /api/auth/logout
router.post("/logout", asyncHandler(async (_req, res) => {
  // Client-side token deletion; server could maintain blocklist if needed
  res.json({ success: true, message: "Logged out successfully" });
}));

// GET /api/auth/me - Get current user
router.get("/me", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw HttpError.unauthorized();
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, email: true, name: true, role: true, branchId: true, isActive: true,
      lastLogin: true, createdAt: true,
      branch: { select: { id: true, code: true, name: true } },
    },
  });

  res.json({ success: true, data: user });
}));

// POST /api/auth/change-password
router.post("/change-password", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) throw HttpError.unauthorized();

  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { passwordHash: true },
  });

  if (!user) throw HttpError.notFound("User not found");

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw HttpError.badRequest("Current password is incorrect");

  const newHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: req.user.id },
    data: { passwordHash: newHash },
  });

  res.json({ success: true, message: "Password changed successfully" });
}));

// POST /api/auth/refresh
router.post("/refresh", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) throw HttpError.unauthorized();

  const token = generateToken(req.user);
  res.json({ success: true, data: { token, expiresIn: process.env.JWT_EXPIRES_IN || "8h" } });
}));

export default router;