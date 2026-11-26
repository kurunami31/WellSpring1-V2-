/**
 * Authentication Middleware
 * JWT verification with role and branch scoping
 */

import { Request, Response, NextFunction } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { prisma } from "../index.js";
import { UserRole } from "@wellspring/shared";

const JWT_SECRET = process.env.JWT_SECRET || "wellspring-dev-secret-change-in-production";
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "8h") as SignOptions["expiresIn"];

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  branchId: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, role: user.role, branchId: user.branchId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.role !== "string" ||
      !Object.values(UserRole).includes(payload.role as UserRole)
    ) {
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role as UserRole,
      branchId: typeof payload.branchId === "string" ? payload.branchId : null,
    };
  } catch {
    return null;
  }
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Missing or invalid authorization header" },
    });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({
      success: false,
      error: { code: "INVALID_TOKEN", message: "Token expired or invalid" },
    });
    return;
  }

  // Fetch fresh user data to ensure account is still active
  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, email: true, name: true, role: true, branchId: true, isActive: true },
  });

  if (!user || !user.isActive) {
    res.status(401).json({
      success: false,
      error: { code: "ACCOUNT_DISABLED", message: "Account is disabled or not found" },
    });
    return;
  }

  req.user = user;
  next();
}

// Optional auth - doesn't fail if no token
export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) {
      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true, email: true, name: true, role: true, branchId: true, isActive: true },
      });
      if (user?.isActive) req.user = user;
    }
  }
  next();
}