import type { BranchRecord, ProductRecord, SaleRecord } from "@/types/prototype";

/** Voided and refunded receipts are excluded from revenue reporting. */
export function isRevenueSale(sale: SaleRecord): boolean {
  return sale.status === "COMPLETED";
}

export interface DashboardMetrics {
  todayRevenue: number;
  todayTransactions: number;
  inventoryUnits: number;
  lowStockCount: number;
}

export interface SalesTrendPoint {
  key: string;
  label: string;
  revenue: number;
  transactions: number;
}

export interface StockCategory {
  name: string;
  units: number;
  productCount: number;
}

export interface FastMovingProduct {
  productId: string;
  name: string;
  units: number;
  revenue: number;
}

export interface StockAlert {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  stock: number;
  reorderPoint: number;
  batch: string;
  expiry: string;
  kind: "STOCK" | "EXPIRY";
  status: "OUT OF STOCK" | "LOW STOCK" | "EXPIRED" | "EXPIRING";
  daysRemaining: number | null;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function parseCalendarDate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getDashboardMetrics(
  sales: SaleRecord[],
  products: ProductRecord[],
  now: Date,
): DashboardMetrics {
  const today = dateKey(now);
  const todaysSales = sales.filter((sale) => isRevenueSale(sale) && dateKey(new Date(sale.createdAt)) === today);

  return {
    todayRevenue: roundCurrency(todaysSales.reduce((sum, sale) => sum + sale.total, 0)),
    todayTransactions: todaysSales.length,
    inventoryUnits: products.reduce((sum, product) => sum + product.stock, 0),
    lowStockCount: products.filter((product) => product.stock <= product.reorderPoint).length,
  };
}

export function buildSalesTrend(sales: SaleRecord[], now: Date): SalesTrendPoint[] {
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = startOfDay(now);
  const points = new Map<string, SalesTrendPoint>();

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - offset);
    const key = dateKey(date);
    points.set(key, {
      key,
      label: `${weekdays[date.getDay()]} ${String(date.getDate()).padStart(2, "0")}`,
      revenue: 0,
      transactions: 0,
    });
  }

  sales.filter(isRevenueSale).forEach((sale) => {
    const point = points.get(dateKey(new Date(sale.createdAt)));
    if (!point) return;
    point.revenue += sale.total;
    point.transactions += 1;
  });

  return Array.from(points.values(), (point) => ({ ...point, revenue: roundCurrency(point.revenue) }));
}

export function getStockCategories(products: ProductRecord[]): StockCategory[] {
  const categories = new Map<string, StockCategory>();
  products.forEach((product) => {
    const category = categories.get(product.category) ?? {
      name: product.category,
      units: 0,
      productCount: 0,
    };
    category.units += product.stock;
    category.productCount += 1;
    categories.set(product.category, category);
  });

  return Array.from(categories.values()).sort((a, b) => b.units - a.units || a.name.localeCompare(b.name));
}

export function getFastMovingProducts(allSales: SaleRecord[], limit = 5): FastMovingProduct[] {
  const products = new Map<string, FastMovingProduct>();
  allSales.filter(isRevenueSale).forEach((sale) => sale.items.forEach((item) => {
    const product = products.get(item.productId) ?? {
      productId: item.productId,
      name: item.productName,
      units: 0,
      revenue: 0,
    };
    product.units += item.quantity;
    product.revenue += item.lineTotal;
    products.set(item.productId, product);
  }));

  return Array.from(products.values())
    .map((product) => ({ ...product, revenue: roundCurrency(product.revenue) }))
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function getStockAlerts(products: ProductRecord[], now: Date, expiryWindowDays = 90): StockAlert[] {
  const today = startOfDay(now);
  const alerts: Array<StockAlert & { priority: number }> = [];

  products.forEach((product) => {
    const base = {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      unit: product.unit,
      stock: product.stock,
      reorderPoint: product.reorderPoint,
      batch: product.batch,
      expiry: product.expiry,
    };

    if (product.stock === 0) {
      alerts.push({ ...base, kind: "STOCK", status: "OUT OF STOCK", daysRemaining: null, priority: 0 });
    } else if (product.stock <= product.reorderPoint) {
      alerts.push({ ...base, kind: "STOCK", status: "LOW STOCK", daysRemaining: null, priority: 2 });
    }

    const expiry = startOfDay(parseCalendarDate(product.expiry));
    const daysRemaining = Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
    if (daysRemaining < 0) {
      alerts.push({ ...base, kind: "EXPIRY", status: "EXPIRED", daysRemaining, priority: 1 });
    } else if (daysRemaining <= expiryWindowDays) {
      alerts.push({ ...base, kind: "EXPIRY", status: "EXPIRING", daysRemaining, priority: 3 });
    }
  });

  return alerts
    .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name) || a.kind.localeCompare(b.kind))
    .map(({ priority: _priority, ...alert }) => alert);
}

export interface BranchPerformance {
  branchId: string;
  code: string;
  name: string;
  city: string;
  revenue: number;
  transactions: number;
  units: number;
}

/** Consolidated today-at-a-glance numbers for head-office accounts. */
export function getBranchPerformance(
  sales: SaleRecord[],
  branches: BranchRecord[],
  now: Date,
): BranchPerformance[] {
  const today = dateKey(now);
  return branches.map((branch) => {
    const branchSales = sales.filter((sale) => isRevenueSale(sale)
      && sale.branchId === branch.id
      && dateKey(new Date(sale.createdAt)) === today);
    return {
      branchId: branch.id,
      code: branch.code,
      name: branch.name,
      city: branch.city,
      revenue: roundCurrency(branchSales.reduce((sum, sale) => sum + sale.total, 0)),
      transactions: branchSales.length,
      units: branchSales.reduce((sum, sale) => sum + sale.items.reduce((lineSum, item) => lineSum + item.quantity, 0), 0),
    };
  }).sort((left, right) => right.revenue - left.revenue);
}
