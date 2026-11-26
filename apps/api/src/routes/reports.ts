/**
 * Reports & Dashboard Routes
 * Branch sales, inventory, consolidated dashboards
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { branchScopeMiddleware, rbacMiddleware } from "../middleware/rbac.js";

const router = Router();
router.use(branchScopeMiddleware);

// ============ BRANCH SALES REPORT ============

router.get("/sales/branch", rbacMiddleware("reports:branch_sales"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { branchId, startDate, endDate, groupBy = "day" } = req.query;
  const whereBranch = ((branchId as string | undefined) || req.user?.branchId) ?? undefined;

  const where: Record<string, unknown> = {
    branchId: whereBranch,
    status: { notIn: ["CANCELLED", "REFUNDED"] },
  };
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: new Date(startDate as string) } : {}),
      ...(endDate ? { lte: new Date(endDate as string) } : {}),
    };
  }

  const sales = await prisma.sale.findMany({ where, select: { createdAt: true, grandTotal: true, paymentMethod: true, discountTotal: true, taxTotal: true } });

  // Group by date
  const grouped = sales.reduce((acc, s) => {
    let key: string;
    const d = new Date(s.createdAt);
    if (groupBy === "hour") key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:00`;
    else if (groupBy === "month") key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    else key = d.toISOString().slice(0, 10);

    if (!acc[key]) acc[key] = { count: 0, revenue: 0, discounts: 0, tax: 0, byPayment: {} };
    acc[key].count++;
    acc[key].revenue += Number(s.grandTotal);
    acc[key].discounts += Number(s.discountTotal);
    acc[key].tax += Number(s.taxTotal);
    acc[key].byPayment[s.paymentMethod] = (acc[key].byPayment[s.paymentMethod] || 0) + 1;
    return acc;
  }, {} as Record<string, { count: number; revenue: number; discounts: number; tax: number; byPayment: Record<string, number> }>);

  res.json({ success: true, data: Object.entries(grouped).map(([date, v]) => ({ date, ...v })) });
}));

// ============ INVENTORY REPORTS ============

// Stock on Hand
router.get("/inventory/stock-on-hand", rbacMiddleware("reports:inventory"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { branchId, categoryId, lowStock } = req.query;
  const whereBranch = ((branchId as string | undefined) || req.user?.branchId) ?? undefined;

  const where: Record<string, unknown> = { branchId: whereBranch };

  const stock = await prisma.stockLevel.findMany({
    where,
    include: { product: { select: { sku: true, name: true, standardPrice: true, costPrice: true, reorderPoint: true, categoryId: true } }, batch: { select: { batchNumber: true, expiryDate: true } } },
  });

  const data = stock
    .filter(s => !categoryId || s.product.categoryId === categoryId)
    .filter(s => lowStock !== "true" || s.quantityAvailable <= s.product.reorderPoint)
    .map(s => ({
      productId: s.productId,
      sku: s.product.sku,
      name: s.product.name,
      batch: s.batch?.batchNumber,
      expiry: s.batch?.expiryDate,
      onHand: s.quantityOnHand,
      available: s.quantityAvailable,
      reorderPoint: s.product.reorderPoint,
      value: Number(s.product.costPrice) * s.quantityOnHand,
      isLow: s.quantityAvailable <= s.product.reorderPoint,
    }));

  res.json({ success: true, data });
}));

// Inventory Ageing
router.get("/inventory/ageing", rbacMiddleware("reports:inventory"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { branchId } = req.query;
  const whereBranch = ((branchId as string | undefined) || req.user?.branchId) ?? undefined;

  const stock = await prisma.stockLevel.findMany({
    where: { branchId: whereBranch, quantityOnHand: { gt: 0 } },
    include: { product: { select: { sku: true, name: true, costPrice: true, createdAt: true } }, batch: { select: { receivedDate: true, expiryDate: true } } },
  });

  const now = new Date();
  const buckets = {
    "0-30": { count: 0, value: 0 },
    "31-60": { count: 0, value: 0 },
    "61-90": { count: 0, value: 0 },
    "91-180": { count: 0, value: 0 },
    "180+": { count: 0, value: 0 },
  };

  for (const s of stock) {
    const received = s.batch?.receivedDate ? new Date(s.batch.receivedDate) : s.product.createdAt;
    const days = Math.floor((now.getTime() - received.getTime()) / (1000 * 60 * 60 * 24));
    const value = Number(s.product.costPrice) * s.quantityOnHand;

    let key: keyof typeof buckets = "180+";
    if (days <= 30) key = "0-30";
    else if (days <= 60) key = "31-60";
    else if (days <= 90) key = "61-90";
    else if (days <= 180) key = "91-180";

    buckets[key].count += s.quantityOnHand;
    buckets[key].value += value;
  }

  res.json({ success: true, data: buckets });
}));

// Expiry Report
router.get("/inventory/expiry", rbacMiddleware("reports:inventory"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { branchId, days = "30" } = req.query;
  const whereBranch = ((branchId as string | undefined) || req.user?.branchId) ?? undefined;
  const cutoff = new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000);

  const batches = await prisma.productBatch.findMany({
    where: { expiryDate: { lte: cutoff, gte: new Date() }, stockLevels: { some: { branchId: whereBranch, quantityOnHand: { gt: 0 } } } },
    include: { product: { select: { sku: true, name: true } }, stockLevels: { where: { branchId: whereBranch } } },
  });

  const data = batches.map(b => ({
    productId: b.productId,
    sku: b.product.sku,
    name: b.product.name,
    batchNumber: b.batchNumber,
    expiryDate: b.expiryDate,
    daysToExpiry: Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    quantityOnHand: b.stockLevels.reduce((s, sl) => s + sl.quantityOnHand, 0),
  }));

  res.json({ success: true, data });
}));

// ============ CONSOLIDATED DASHBOARD (HO) ============

router.get("/dashboard/consolidated", rbacMiddleware("reports:consolidated"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== "HEAD_OFFICE_MANAGER" && req.user?.role !== "SYSTEM_ADMIN") {
    throw HttpError.forbidden("Head office access required");
  }

  const { startDate, endDate } = req.query;
  const where: Record<string, unknown> = {};
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: new Date(startDate as string) } : {}),
      ...(endDate ? { lte: new Date(endDate as string) } : {}),
    };
  }

  // Parallel queries
  const [sales, branches, lowStockLevels, totalInventoryValue] = await Promise.all([
    prisma.sale.aggregate({ where: { ...where, status: { notIn: ["CANCELLED", "REFUNDED"] } }, _sum: { grandTotal: true }, _count: true }),
    prisma.branch.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true } }),
    prisma.stockLevel.findMany({
      select: { quantityAvailable: true, product: { select: { reorderPoint: true } } },
    }),
    prisma.stockLevel.aggregate({ _sum: { quantityOnHand: true } }),
  ]);

  // Per-branch sales
  const branchSales = await Promise.all(branches.map(async b => {
    const s = await prisma.sale.aggregate({ where: { ...where, branchId: b.id, status: { notIn: ["CANCELLED", "REFUNDED"] } }, _sum: { grandTotal: true }, _count: true });
    return { branchId: b.id, code: b.code, name: b.name, revenue: Number(s._sum.grandTotal || 0), transactions: s._count };
  }));

  res.json({
    success: true,
    data: {
      summary: {
        totalRevenue: Number(sales._sum.grandTotal || 0),
        totalTransactions: sales._count,
        lowStockItems: lowStockLevels.filter(s => s.quantityAvailable <= s.product.reorderPoint).length,
        totalInventoryQty: totalInventoryValue._sum.quantityOnHand || 0,
      },
      byBranch: branchSales,
    },
  });
}));

// ============ BIR REPORT ============

router.get("/bir/sales", rbacMiddleware("reports:branch_sales"), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { branchId, startDate, endDate } = req.query;
  const whereBranch = ((branchId as string | undefined) || req.user?.branchId) ?? undefined;
  const where: Record<string, unknown> = { branchId: whereBranch, status: { notIn: ["CANCELLED", "REFUNDED"] } };
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: new Date(startDate as string) } : {}),
      ...(endDate ? { lte: new Date(endDate as string) } : {}),
    };
  }

  const sales = await prisma.sale.findMany({
    where,
    select: { receiptNumber: true, receiptSerial: true, createdAt: true, grandTotal: true, taxTotal: true, customerType: true, paymentMethod: true },
    orderBy: { createdAt: "asc" },
  });

  res.json({ success: true, data: sales });
}));

export default router;