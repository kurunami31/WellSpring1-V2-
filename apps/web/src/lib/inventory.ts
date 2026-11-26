import type { BatchAllocation, BatchRecord, ProductRecord } from "@/types/prototype";

const DAY_MS = 86_400_000;

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Parses a YYYY-MM-DD value as a local calendar date, avoiding UTC drift. */
export function parseCalendarDate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function daysUntil(expiry: string, now = new Date()): number {
  return Math.round((parseCalendarDate(expiry).getTime() - startOfDay(now).getTime()) / DAY_MS);
}

export function isExpired(batch: BatchRecord, now = new Date()): boolean {
  return daysUntil(batch.expiry, now) < 0;
}

export function sellableQuantity(product: ProductRecord, now = new Date()): number {
  return product.batches.reduce((sum, batch) => sum + (isExpired(batch, now) ? 0 : batch.quantity), 0);
}

export function expiredQuantity(product: ProductRecord, now = new Date()): number {
  return product.batches.reduce((sum, batch) => sum + (isExpired(batch, now) ? batch.quantity : 0), 0);
}

export function sortForFefo(batches: BatchRecord[]): BatchRecord[] {
  return [...batches].sort((left, right) => left.expiry.localeCompare(right.expiry) || left.batchNumber.localeCompare(right.batchNumber));
}

export function earliestSellableBatch(product: ProductRecord, now = new Date()): BatchRecord | undefined {
  return sortForFefo(product.batches).find((batch) => batch.quantity > 0 && !isExpired(batch, now));
}

export interface FefoResult {
  allocations: BatchAllocation[];
  remaining: number;
}

/**
 * Allocates a sale quantity across batches, first-expiry-first-out.
 * Expired batches are never allocated.
 */
export function allocateFefo(batches: BatchRecord[], quantity: number, now = new Date()): FefoResult {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Quantity must be a whole number greater than zero.");
  const allocations: BatchAllocation[] = [];
  let remaining = quantity;

  for (const batch of sortForFefo(batches)) {
    if (remaining === 0) break;
    if (batch.quantity <= 0 || isExpired(batch, now)) continue;
    const taken = Math.min(batch.quantity, remaining);
    allocations.push({ batchNumber: batch.batchNumber, expiry: batch.expiry, quantity: taken });
    remaining -= taken;
  }

  return { allocations, remaining };
}

/** Deducts allocations from the matching batches and drops emptied batches. */
export function deductBatches(batches: BatchRecord[], allocations: BatchAllocation[]): BatchRecord[] {
  return batches
    .map((batch) => {
      const taken = allocations
        .filter((allocation) => allocation.batchNumber === batch.batchNumber)
        .reduce((sum, allocation) => sum + allocation.quantity, 0);
      return { ...batch, quantity: batch.quantity - taken };
    })
    .filter((batch) => batch.quantity > 0);
}

export function restoreBatches(batches: BatchRecord[], allocations: BatchAllocation[], receivedAt = new Date().toISOString()): BatchRecord[] {
  const next = batches.map((batch) => ({ ...batch }));
  for (const allocation of allocations) {
    const existing = next.find((batch) => batch.batchNumber === allocation.batchNumber);
    if (existing) existing.quantity += allocation.quantity;
    else next.push({ id: `batch-${allocation.batchNumber}`, batchNumber: allocation.batchNumber, expiry: allocation.expiry, quantity: allocation.quantity, receivedAt });
  }
  return next;
}

/** Recomputes the cached stock/batch/expiry fields from the batch ledger. */
export function syncProduct(product: ProductRecord, now = new Date()): ProductRecord {
  const sellable = sellableQuantity(product, now);
  const earliest = earliestSellableBatch(product, now);
  return {
    ...product,
    stock: sellable,
    batch: earliest?.batchNumber ?? product.batches[0]?.batchNumber ?? "—",
    expiry: earliest?.expiry ?? product.batches[0]?.expiry ?? "",
  };
}

export type ProductStockStatus = "IN STOCK" | "LOW STOCK" | "OUT OF STOCK" | "EXPIRING" | "EXPIRED";

export function productStatus(product: ProductRecord, now = new Date()): ProductStockStatus {
  const sellable = sellableQuantity(product, now);
  if (sellable === 0) return expiredQuantity(product, now) > 0 ? "EXPIRED" : "OUT OF STOCK";
  const earliest = earliestSellableBatch(product, now);
  if (earliest && daysUntil(earliest.expiry, now) <= 90) return "EXPIRING";
  if (sellable <= product.reorderPoint) return "LOW STOCK";
  return "IN STOCK";
}

export function batchStatus(batch: BatchRecord, now = new Date()): "EXPIRED" | "EXPIRING" | "ON HAND" | "DEPLETED" {
  if (batch.quantity === 0) return "DEPLETED";
  const days = daysUntil(batch.expiry, now);
  if (days < 0) return "EXPIRED";
  if (days <= 90) return "EXPIRING";
  return "ON HAND";
}

export function stockAtCost(products: ProductRecord[], now = new Date()): number {
  return roundCurrency(products.reduce((sum, product) => sum + sellableQuantity(product, now) * product.cost, 0));
}

export function stockUnits(products: ProductRecord[], now = new Date()): number {
  return products.reduce((sum, product) => sum + sellableQuantity(product, now), 0);
}
