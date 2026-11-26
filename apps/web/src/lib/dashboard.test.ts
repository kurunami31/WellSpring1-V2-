import { PaymentMethod } from "@wellspring/shared";
import { describe, expect, it } from "vitest";
import type { ProductRecord, SaleRecord } from "@/types/prototype";
import {
  buildSalesTrend,
  getDashboardMetrics,
  getFastMovingProducts,
  getStockAlerts,
  getStockCategories,
} from "./dashboard";

const NOW = new Date("2026-11-25T12:00:00");

function product(overrides: Partial<ProductRecord>): ProductRecord {
  return {
    id: "p-default",
    sku: "DEFAULT-1",
    barcode: "4801234500000",
    name: "Default medicine",
    category: "OTC medicine",
    unit: "tablet",
    price: 10,
    cost: 5,
    stock: 20,
    reorderPoint: 10,
    batch: "DEFAULT-BATCH",
    expiry: "2027-11-25",
    prescription: false,
    batches: [{ id: "batch-default", batchNumber: "DEFAULT-BATCH", expiry: "2027-11-25", quantity: 20, receivedAt: "2026-01-01" }],
    ...overrides,
  };
}

function sale(overrides: Partial<SaleRecord>): SaleRecord {
  return {
    id: "s-default",
    receiptNumber: "WS-2026-00001",
    createdAt: "2026-11-25T09:00:00",
    branchId: "branch-ws01",
    branchCode: "WS01",
    cashier: "Frankie Pelayo",
    customerType: "REGULAR",
    paymentMethod: PaymentMethod.CASH,
    items: [],
    subtotal: 100,
    discount: 0,
    vat: 12,
    total: 112,
    loyaltyPointsEarned: 0,
    loyaltyPointsRedeemed: 0,
    loyaltyDiscount: 0,
    status: "COMPLETED",
    offline: false,
    ...overrides,
  };
}

describe("getDashboardMetrics", () => {
  it("counts only today's sales and includes all current stock risks", () => {
    const sales = [
      sale({ id: "today-1", total: 100.5 }),
      sale({ id: "today-2", createdAt: "2026-11-25T11:30:00", total: 49.5 }),
      sale({ id: "yesterday", createdAt: "2026-11-24T23:59:00", total: 999 }),
    ];
    const products = [
      product({ id: "low", stock: 10, reorderPoint: 20 }),
      product({ id: "empty", stock: 0, reorderPoint: 5 }),
      product({ id: "healthy", stock: 100, reorderPoint: 10 }),
    ];

    expect(getDashboardMetrics(sales, products, NOW)).toEqual({
      todayRevenue: 150,
      todayTransactions: 2,
      inventoryUnits: 110,
      lowStockCount: 2,
    });
  });
});

describe("buildSalesTrend", () => {
  it("returns seven local calendar days with zeroes for missing dates", () => {
    const sales = [
      sale({ id: "current", createdAt: "2026-11-25T09:00:00", total: 50 }),
      sale({ id: "first", createdAt: "2026-11-19T09:00:00", total: 25 }),
      sale({ id: "outside", createdAt: "2026-11-18T23:59:00", total: 500 }),
    ];

    expect(buildSalesTrend(sales, NOW)).toEqual([
      { key: "2026-11-19", label: "Thu 19", revenue: 25, transactions: 1 },
      { key: "2026-11-20", label: "Fri 20", revenue: 0, transactions: 0 },
      { key: "2026-11-21", label: "Sat 21", revenue: 0, transactions: 0 },
      { key: "2026-11-22", label: "Sun 22", revenue: 0, transactions: 0 },
      { key: "2026-11-23", label: "Mon 23", revenue: 0, transactions: 0 },
      { key: "2026-11-24", label: "Tue 24", revenue: 0, transactions: 0 },
      { key: "2026-11-25", label: "Wed 25", revenue: 50, transactions: 1 },
    ]);
  });
});

describe("getStockCategories", () => {
  it("aggregates stock units by category from largest to smallest", () => {
    const products = [
      product({ id: "otc-1", category: "OTC medicine", stock: 60 }),
      product({ id: "rx", category: "Prescription", stock: 20 }),
      product({ id: "otc-2", category: "OTC medicine", stock: 40 }),
    ];

    expect(getStockCategories(products)).toEqual([
      { name: "OTC medicine", units: 100, productCount: 2 },
      { name: "Prescription", units: 20, productCount: 1 },
    ]);
  });
});

describe("getFastMovingProducts", () => {
  it("combines repeat sales and ranks products by units sold", () => {
    const sales = [
      sale({
        id: "sale-1",
        items: [
          { productId: "p-para", productName: "Paracetamol", sku: "PARA-500", quantity: 2, unitPrice: 6.5, lineTotal: 14.56, batchAllocations: [], prescription: false },
          { productId: "p-cet", productName: "Cetirizine", sku: "CET-10", quantity: 4, unitPrice: 7.25, lineTotal: 32.48, batchAllocations: [], prescription: false },
        ],
      }),
      sale({
        id: "sale-2",
        items: [
          { productId: "p-para", productName: "Paracetamol", sku: "PARA-500", quantity: 3, unitPrice: 6.5, lineTotal: 21.84, batchAllocations: [], prescription: false },
        ],
      }),
    ];

    expect(getFastMovingProducts(sales)).toEqual([
      { productId: "p-para", name: "Paracetamol", units: 5, revenue: 36.4 },
      { productId: "p-cet", name: "Cetirizine", units: 4, revenue: 32.48 },
    ]);
  });
});

describe("getStockAlerts", () => {
  it("reports expired, expiring, out-of-stock, and low-stock products only", () => {
    const products = [
      product({ id: "expired", expiry: "2026-11-24", stock: 20, reorderPoint: 10 }),
      product({ id: "expiring", expiry: "2026-12-20", stock: 20, reorderPoint: 10 }),
      product({ id: "empty", expiry: "2027-11-25", stock: 0, reorderPoint: 10 }),
      product({ id: "low", expiry: "2027-11-25", stock: 5, reorderPoint: 10 }),
      product({ id: "healthy", expiry: "2027-11-25", stock: 50, reorderPoint: 10 }),
    ];

    expect(getStockAlerts(products, NOW).map(({ productId, kind, status }) => ({ productId, kind, status }))).toEqual([
      { productId: "empty", kind: "STOCK", status: "OUT OF STOCK" },
      { productId: "expired", kind: "EXPIRY", status: "EXPIRED" },
      { productId: "low", kind: "STOCK", status: "LOW STOCK" },
      { productId: "expiring", kind: "EXPIRY", status: "EXPIRING" },
    ]);
  });
});
