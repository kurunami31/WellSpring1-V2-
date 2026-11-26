/**
 * Global Error Handler
 * Standardized error responses across the API
 */

import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: Record<string, unknown>;
}

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "HttpError";
  }

  static badRequest(message: string, details?: Record<string, unknown>) {
    return new HttpError(400, "BAD_REQUEST", message, details);
  }

  static unauthorized(message = "Unauthorized", details?: Record<string, unknown>) {
    return new HttpError(401, "UNAUTHORIZED", message, details);
  }

  static forbidden(message = "Forbidden", details?: Record<string, unknown>) {
    return new HttpError(403, "FORBIDDEN", message, details);
  }

  static notFound(message = "Resource not found", details?: Record<string, unknown>) {
    return new HttpError(404, "NOT_FOUND", message, details);
  }

  static conflict(message: string, details?: Record<string, unknown>) {
    return new HttpError(409, "CONFLICT", message, details);
  }

  static internal(message = "Internal server error", details?: Record<string, unknown>) {
    return new HttpError(500, "INTERNAL_ERROR", message, details);
  }
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("❌ Error:", err);

  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: err.flatten().fieldErrors,
      },
    });
    return;
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    handlePrismaError(err, res);
    return;
  }

  // Custom HTTP errors
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  // Generic errors
  const isDev = process.env.NODE_ENV === "development";
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.code || "INTERNAL_ERROR",
      message: isDev ? err.message : "An unexpected error occurred",
      details: isDev ? { stack: err.stack } : undefined,
    },
  });
}

function handlePrismaError(err: Prisma.PrismaClientKnownRequestError, res: Response): void {
  switch (err.code) {
    case "P2002": // Unique constraint violation
      res.status(409).json({
        success: false,
        error: { code: "DUPLICATE_ENTRY", message: "A record with this value already exists" },
      });
      break;
    case "P2003": // Foreign key constraint
      res.status(400).json({
        success: false,
        error: { code: "INVALID_REFERENCE", message: "Referenced record does not exist" },
      });
      break;
    case "P2025": // Record not found
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Record not found" },
      });
      break;
    default:
      res.status(500).json({
        success: false,
        error: { code: "DATABASE_ERROR", message: "Database operation failed" },
      });
  }
}

// Async wrapper to catch errors in route handlers
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}