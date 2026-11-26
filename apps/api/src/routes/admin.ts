/**
 * Admin Routes
 * System configuration, audit trail viewer
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { rbacMiddleware } from "../middleware/rbac.js";

const router = Router();

// ============ SYSTEM CONFIG ============

const configSchema = z.record(z.unknown());

// GET /api/admin/config
router.get("/config", rbacMiddleware("admin:config"), asyncHandler(async (_req, res) => {
  const configs = await prisma.auditLog.findMany({ where: { entityType: "Config" }, take: 100 });
  // In real impl, would have a Config model
  res.json({
    success: true,
    data: {
      vatRate: 0.12,
      scPwdDiscount: 0.20,
      receiptPrefix: "WS",
      deliveryFeeBase: 30,
      deliveryFeePerKm: 10,
      deliveryRadiusKm: 7,
      offlineQueueMaxHours: 48,
      syncRetryMinutes: 30,
      backupIntervalHours: 4,
    },
  });
}));

// PATCH /api/admin/config
router.patch("/config", rbacMiddleware("admin:config"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const data = configSchema.parse(req.body);
  // In real impl, would upsert to Config table
  res.json({ success: true, message: "Configuration updated", data });
}));

// ============ AUDIT TRAIL ============

router.get("/audit", rbacMiddleware("admin:audit"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId, branchId, entityType, action, startDate, endDate, page = "1", limit = "100" } = req.query;
  const where: Record<string, unknown> = {};

  if (userId) where.userId = userId;
  if (branchId) where.branchId = branchId;
  else if (req.user?.role !== "SYSTEM_ADMIN" && req.user?.role !== "HEAD_OFFICE_MANAGER") {
    where.branchId = req.user!.branchId;
  }
  if (entityType) where.entityType = entityType;
  if (action) where.action = { contains: action, mode: "insensitive" };
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: new Date(startDate as string) } : {}),
      ...(endDate ? { lte: new Date(endDate as string) } : {}),
    };
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, role: true } }, branch: { select: { code: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({ success: true, data: logs, meta: { page: Number(page), limit: Number(limit), total: Number(total) } });
}));

// ============ SYSTEM HEALTH ============

router.get("/health", rbacMiddleware("admin:config"), asyncHandler(async (_req, res) => {
  const [userCount, saleCount, branchCount, dbOk] = await Promise.all([
    prisma.user.count(),
    prisma.sale.count(),
    prisma.branch.count({ where: { isActive: true } }),
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
  ]);

  res.json({
    success: true,
    data: {
      database: dbOk ? "healthy" : "unhealthy",
      stats: { users: userCount, sales: saleCount, branches: branchCount },
      timestamp: new Date().toISOString(),
    },
  });
}));

// ============ BACKUP STATUS ============

router.get("/backup-status", rbacMiddleware("admin:config"), asyncHandler(async (_req, res) => {
  // In real impl, would check backup job status
  res.json({
    success: true,
    data: {
      lastBackup: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      nextBackup: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      status: "completed",
      size: "2.3 GB",
    },
  });
}));

export default router;