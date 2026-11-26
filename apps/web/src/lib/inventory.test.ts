import { describe, expect, it } from "vitest";
import type { BatchRecord, ProductRecord } from "@/types/prototype";
import { allocateFefo, deductBatches, restoreBatches, sellableQuantity } from "./inventory";

const NOW = new Date("2026-11-27T09:00:00");

function batch(overrides: Partial<BatchRecord>): BatchRecord {
  return {
    id: "batch-default",
    batchNumber: "BATCH-1",
    expiry: "2027-12-31",
    quantity: 10,
    receivedAt: "2026-01-01",
    ...overrides,
  };
}

describe("allocateFefo", () => {
  it("takes the earliest expiry first and splits across batches", () => {
    const result = allocateFefo([
      batch({ batchNumber: "LATE", expiry: "2028-06-30", quantity: 50 }),
      batch({ batchNumber: "SOON", expiry: "2027-01-31", quantity: 5 }),
    ], 8, NOW);

    expect(result.remaining).toBe(0);
    expect(result.allocations).toEqual([
      { batchNumber: "SOON", expiry: "2027-01-31", quantity: 5 },
      { batchNumber: "LATE", expiry: "2028-06-30", quantity: 3 },
    ]);
  });

  it("never allocates expired stock", () => {
    const result = allocateFefo([
      batch({ batchNumber: "EXPIRED", expiry: "2026-01-01", quantity: 90 }),
      batch({ batchNumber: "GOOD", expiry: "2027-02-01", quantity: 4 }),
    ], 6, NOW);

    expect(result.allocations).toEqual([{ batchNumber: "GOOD", expiry: "2027-02-01", quantity: 4 }]);
    expect(result.remaining).toBe(2);
  });

  it("rejects non-integer quantities", () => {
    expect(() => allocateFefo([batch({})], 1.5, NOW)).toThrow("whole number");
    expect(() => allocateFefo([batch({})], 0, NOW)).toThrow("greater than zero");
  });
});

describe("batch deductions", () => {
  it("removes emptied batches and restores them on a return", () => {
    const source = [
      batch({ batchNumber: "SOON", expiry: "2027-01-31", quantity: 5 }),
      batch({ batchNumber: "LATE", expiry: "2028-06-30", quantity: 10 }),
    ];
    const allocations = allocateFefo(source, 5, NOW).allocations;
    const deducted = deductBatches(source, allocations);

    expect(deducted.map((entry) => entry.batchNumber)).toEqual(["LATE"]);
    const restored = restoreBatches(deducted, allocations, "2026-11-27T10:00:00.000Z");
    expect(restored.find((entry) => entry.batchNumber === "SOON")?.quantity).toBe(5);
    expect(restored.find((entry) => entry.batchNumber === "LATE")?.quantity).toBe(10);
  });

  it("excludes expired units from sellable quantity", () => {
    const batches = [
      batch({ batchNumber: "EXPIRED", expiry: "2026-11-01", quantity: 7 }),
      batch({ batchNumber: "GOOD", expiry: "2027-11-01", quantity: 3 }),
    ];
    const product: ProductRecord = {
      id: "p-test",
      sku: "TEST-1",
      barcode: "4800000000001",
      name: "Test product",
      category: "OTC medicine",
      unit: "tablet",
      price: 10,
      cost: 5,
      stock: 3,
      reorderPoint: 2,
      batch: "GOOD",
      expiry: "2027-11-01",
      prescription: false,
      batches,
    };
    expect(sellableQuantity(product, NOW)).toBe(3);
  });
});
