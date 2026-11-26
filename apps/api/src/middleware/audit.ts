/**
 * Audit Log Middleware
 * Automatically logs all authenticated requests for compliance
 */

import { Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { AuthenticatedRequest } from "./auth.js";
import { prisma } from "../index.js";

export async function auditMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const startTime = Date.now();

  // Capture response
  const originalSend = res.send;
  let responseBody: unknown;

  res.send = function (body?: unknown): Response {
    responseBody = body;
    return originalSend.call(this, body);
  };

  res.on("finish", async () => {
    if (!req.user) return; // Only audit authenticated requests

    const duration = Date.now() - startTime;
    const isError = res.statusCode >= 400;

    // Skip logging for health checks and static assets
    if (req.path === "/health" || req.path.startsWith("/static")) return;

    try {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          branchId: req.user.branchId,
          action: `${req.method} ${req.path}`,
          entityType: extractEntityType(req.path),
          entityId: extractEntityId(req.path, req.params),
          before: isError ? undefined : toInputJson(req.body),
          after: isError ? undefined : toInputJson(responseBody),
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers["user-agent"],
        },
      });
    } catch (err) {
      // Don't fail the request if audit logging fails
      console.error("Audit log failed:", err);
    }
  });

  next();
}

function extractEntityType(path: string): string {
  // Extract entity from route like /api/products/123 -> products
  const match = path.match(/^\/api\/([^\/]+)/);
  return match?.[1] || "unknown";
}

function extractEntityId(path: string, params: Record<string, string>): string | null {
  // Try to get ID from route params
  const idParam = params.id || params.saleId || params.productId || params.branchId ||
                  params.poId || params.grnId || params.transferId;
  return idParam || null;
}

function toInputJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

// Manual audit logging for complex operations
export async function createAuditLog(
  userId: string,
  branchId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  before?: Record<string, unknown> | null,
  after?: Record<string, unknown> | null,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        branchId,
        action,
        entityType,
        entityId,
        before: toInputJson(before),
        after: toInputJson(after),
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    console.error("Manual audit log failed:", err);
  }
}