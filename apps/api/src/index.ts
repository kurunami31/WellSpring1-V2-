/**
 * WellSpring POS/Inventory — API Entry Point
 * Express + TypeScript + Prisma
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { errorHandler } from "./middleware/errorHandler.js";
import { authMiddleware } from "./middleware/auth.js";
import { rbacMiddleware } from "./middleware/rbac.js";
import { auditMiddleware } from "./middleware/audit.js";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import branchRoutes from "./routes/branches.js";
import productRoutes from "./routes/products.js";
import inventoryRoutes from "./routes/inventory.js";
import saleRoutes from "./routes/sales.js";
import purchasingRoutes from "./routes/purchasing.js";
import reportRoutes from "./routes/reports.js";
import adminRoutes from "./routes/admin.js";
import syncRoutes from "./routes/sync.js";

import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

const app = express();
const PORT = process.env.PORT || 3001;

// ============ GLOBAL MIDDLEWARE ============
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: { success: false, error: { code: "RATE_LIMIT", message: "Too many requests" } },
});
app.use("/api/", limiter);

// Stricter rate limit for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: { code: "RATE_LIMIT", message: "Too many login attempts" } },
});
app.use("/api/auth/login", authLimiter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok", timestamp: new Date().toISOString() } });
});

// ============ ROUTES ============
// Public routes
app.use("/api/auth", authRoutes);

// Protected routes (require authentication)
app.use("/api", authMiddleware);
app.use("/api", auditMiddleware); // Log all authenticated requests

app.use("/api/users", rbacMiddleware("admin:users"), userRoutes);
app.use("/api/branches", rbacMiddleware("admin:config"), branchRoutes);
app.use("/api/products", rbacMiddleware("inventory:read"), productRoutes);
app.use("/api/inventory", rbacMiddleware("inventory:read"), inventoryRoutes);
app.use("/api/sales", rbacMiddleware("sales:read"), saleRoutes);
app.use("/api/purchasing", purchasingRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/sync", syncRoutes); // Special handling for offline sync

// ============ ERROR HANDLING ============
app.use((_req, _res, next) => {
  const err = new Error("Not Found") as Error & { statusCode?: number };
  err.statusCode = 404;
  next(err);
});
app.use(errorHandler);

// ============ START SERVER ============
const server = app.listen(PORT, () => {
  console.log(`🚀 WellSpring API running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...");
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});

export default app;