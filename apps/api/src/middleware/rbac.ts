/**
 * Role-Based Access Control Middleware
 * Enforces permissions based on user role and branch scoping
 */

import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth.js";
import { UserRole, hasPermission, ROLE_HIERARCHY } from "@wellspring/shared";

type Permission = keyof typeof import("@wellspring/shared").PERMISSIONS;

export function rbacMiddleware(permission: Permission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
      return;
    }

    const { role, branchId } = req.user;

    // SYSTEM_ADMIN bypasses all checks
    if (role === UserRole.SYSTEM_ADMIN) {
      next();
      return;
    }

    // Check role permission
    if (!hasPermission(role, permission)) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: `Insufficient permissions: ${permission} required` },
      });
      return;
    }

    // Branch scoping: users can only access their own branch data
    // (except HEAD_OFFICE_MANAGER who sees all branches)
    if (branchId && role !== UserRole.HEAD_OFFICE_MANAGER) {
      // Add branchId to query params for downstream routes
      req.query.branchId = branchId;
    }

    next();
  };
}

// Higher-order middleware for multiple permissions (OR logic)
export function rbacAnyMiddleware(...permissions: Permission[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } });
      return;
    }

    const { role } = req.user;
    if (role === UserRole.SYSTEM_ADMIN) {
      next();
      return;
    }

    const hasAny = permissions.some(p => hasPermission(role, p));
    if (!hasAny) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: `Requires one of: ${permissions.join(", ")}` },
      });
      return;
    }

    next();
  };
}

// Branch access check - ensures user can only access their branch
export function branchScopeMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } });
    return;
  }

  const { role, branchId } = req.user;
  const requestedBranchId = req.params.branchId || req.query.branchId;

  // SYSTEM_ADMIN and HEAD_OFFICE_MANAGER can access any branch
  if (role === UserRole.SYSTEM_ADMIN || role === UserRole.HEAD_OFFICE_MANAGER) {
    next();
    return;
  }

  // If no branch specified, use user's branch
  if (!requestedBranchId) {
    if (branchId) {
      req.query.branchId = branchId;
      next();
      return;
    }
    res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "No branch assigned" } });
    return;
  }

  // Check if requested branch matches user's branch
  if (branchId && requestedBranchId !== branchId) {
    res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Cannot access other branches" } });
    return;
  }

  next();
}