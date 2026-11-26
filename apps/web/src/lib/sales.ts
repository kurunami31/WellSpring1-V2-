export type CustomerType = "REGULAR" | "SENIOR" | "PWD" | "LOYALTY";

export interface SaleLineInput {
  unitPrice: number;
  quantity: number;
  discountPerUnit: number;
  taxRate: number;
}

export interface SaleTotals {
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface SaleTotalsOptions {
  /** Loyalty or promotional discount applied after VAT, in pesos. */
  extraDiscount?: number;
}

export function calculateSaleTotals(
  lines: SaleLineInput[],
  customerType: CustomerType,
  options: SaleTotalsOptions = {},
): SaleTotals {
  if (lines.length === 0) throw new Error("Add at least one item before checkout.");

  let subtotal = 0;
  let itemDiscount = 0;
  let vat = 0;

  for (const line of lines) {
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      throw new Error("Quantity must be greater than zero.");
    }
    if (!Number.isFinite(line.unitPrice) || line.unitPrice <= 0) {
      throw new Error("Unit price must be greater than zero.");
    }
    if (!Number.isFinite(line.discountPerUnit) || line.discountPerUnit < 0) {
      throw new Error("Discount cannot be negative.");
    }
    if (line.discountPerUnit > line.unitPrice) {
      throw new Error("Discount cannot exceed the unit price.");
    }
    if (!Number.isFinite(line.taxRate) || line.taxRate < 0) {
      throw new Error("Tax rate cannot be negative.");
    }

    const lineSubtotal = line.unitPrice * line.quantity;
    const lineDiscount = line.discountPerUnit * line.quantity;
    subtotal += lineSubtotal;
    itemDiscount += lineDiscount;
    vat += (lineSubtotal - lineDiscount) * line.taxRate;
  }

  const isVatExempt = customerType === "SENIOR" || customerType === "PWD";
  const statutoryDiscount = isVatExempt ? (subtotal - itemDiscount) * 0.2 : 0;
  const discount = roundCurrency(itemDiscount + statutoryDiscount);
  const roundedSubtotal = roundCurrency(subtotal);
  const roundedVat = isVatExempt ? 0 : roundCurrency(vat);
  const grossBeforeExtra = roundCurrency(roundedSubtotal - discount + roundedVat);
  const extraDiscount = roundCurrency(options.extraDiscount ?? 0);

  if (!Number.isFinite(extraDiscount) || extraDiscount < 0) {
    throw new Error("Additional discount cannot be negative.");
  }
  if (extraDiscount > grossBeforeExtra) {
    throw new Error("Additional discount cannot exceed the amount due.");
  }

  return {
    subtotal: roundedSubtotal,
    discount,
    vat: roundedVat,
    total: roundCurrency(grossBeforeExtra - extraDiscount),
  };
}

export function calculateChange(cashTendered: number, total: number): number {
  if (!Number.isFinite(cashTendered) || cashTendered < total) {
    throw new Error("Cash tendered is less than the total.");
  }
  return roundCurrency(cashTendered - total);
}
