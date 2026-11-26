import { describe, expect, it } from "vitest";
import { calculateChange, calculateSaleTotals } from "./sales";

describe("calculateSaleTotals", () => {
  it("adds 12% VAT to a regular VAT-exclusive sale", () => {
    expect(
      calculateSaleTotals(
        [{ unitPrice: 100, quantity: 2, discountPerUnit: 0, taxRate: 0.12 }],
        "REGULAR",
      ),
    ).toEqual({ subtotal: 200, discount: 0, vat: 24, total: 224 });
  });

  it("applies the 20% senior discount and removes VAT", () => {
    expect(
      calculateSaleTotals(
        [{ unitPrice: 100, quantity: 2, discountPerUnit: 0, taxRate: 0.12 }],
        "SENIOR",
      ),
    ).toEqual({ subtotal: 200, discount: 40, vat: 0, total: 160 });
  });

  it("rounds currency totals to centavos", () => {
    expect(
      calculateSaleTotals(
        [{ unitPrice: 33.33, quantity: 3, discountPerUnit: 0, taxRate: 0.12 }],
        "REGULAR",
      ),
    ).toEqual({ subtotal: 99.99, discount: 0, vat: 12, total: 111.99 });
  });

  it("rejects a sale with no items", () => {
    expect(() => calculateSaleTotals([], "REGULAR")).toThrow("Add at least one item");
  });

  it("applies loyalty credit after VAT and refuses over-discounting", () => {
    expect(
      calculateSaleTotals(
        [{ unitPrice: 100, quantity: 2, discountPerUnit: 0, taxRate: 0.12 }],
        "REGULAR",
        { extraDiscount: 20 },
      ),
    ).toEqual({ subtotal: 200, discount: 0, vat: 24, total: 204 });

    expect(() =>
      calculateSaleTotals(
        [{ unitPrice: 10, quantity: 1, discountPerUnit: 0, taxRate: 0.12 }],
        "REGULAR",
        { extraDiscount: 20 },
      ),
    ).toThrow("cannot exceed");
  });

  it("rejects invalid quantities and discounts", () => {
    expect(() =>
      calculateSaleTotals(
        [{ unitPrice: 100, quantity: 0, discountPerUnit: 0, taxRate: 0.12 }],
        "REGULAR",
      ),
    ).toThrow("Quantity must be greater than zero");
    expect(() =>
      calculateSaleTotals(
        [{ unitPrice: 100, quantity: 1, discountPerUnit: -1, taxRate: 0.12 }],
        "REGULAR",
      ),
    ).toThrow("Discount cannot be negative");
  });
});

describe("calculateChange", () => {
  it("returns the cash change rounded to centavos", () => {
    expect(calculateChange(500, 224.25)).toBe(275.75);
  });

  it("rejects insufficient cash", () => {
    expect(() => calculateChange(200, 224)).toThrow("Cash tendered is less than the total");
  });
});
