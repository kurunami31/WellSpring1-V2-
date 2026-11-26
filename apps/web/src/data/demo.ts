import { PaymentMethod, UserRole } from "@wellspring/shared";
import { BRANCHES, branchLabel } from "@/data/branches";
import { allocateFefo, syncProduct } from "@/lib/inventory";
import { calculateSaleTotals, type CustomerType } from "@/lib/sales";
import type {
  AdminUserRecord,
  AuditRecord,
  BatchRecord,
  DemoUser,
  LoyaltyMemberRecord,
  ProductRecord,
  PurchaseOrderRecord,
  SaleRecord,
  SaleStatus,
  StockMovementRecord,
  SupplierRecord,
} from "@/types/prototype";

export const DEMO_PASSWORD = "password123";
export const MAIN_BRANCH_ID = "branch-ws01";
const CURRENT_YEAR = new Date().getFullYear();

export const DEMO_USERS: DemoUser[] = [
  { id: "u-admin", email: "admin@wellspring.ph", name: "Christopher Mercado", role: UserRole.SYSTEM_ADMIN, branchId: null, branchName: "All branches" },
  { id: "u-ho", email: "ho.manager@wellspring.ph", name: "Bianca Benaldo", role: UserRole.HEAD_OFFICE_MANAGER, branchId: null, branchName: "Head office" },
  { id: "u-manager", email: "branch1.mgr@wellspring.ph", name: "Rick Perez", role: UserRole.BRANCH_MANAGER, branchId: "branch-ws01", branchName: branchLabel("branch-ws01") },
  { id: "u-cashier", email: "cashier1@wellspring.ph", name: "Frankie Pelayo", role: UserRole.CASHIER, branchId: "branch-ws01", branchName: branchLabel("branch-ws01") },
  { id: "u-pharmacist", email: "pharmacist1@wellspring.ph", name: "Mave Ancog", role: UserRole.PHARMACIST, branchId: "branch-ws02", branchName: branchLabel("branch-ws02") },
  { id: "u-inventory", email: "inventory1@wellspring.ph", name: "Mark Punto", role: UserRole.INVENTORY_STAFF, branchId: "branch-ws03", branchName: branchLabel("branch-ws03") },
  { id: "u-purchasing", email: "purchasing1@wellspring.ph", name: "Asaph Ildefonso", role: UserRole.PURCHASING_OFFICER, branchId: MAIN_BRANCH_ID, branchName: branchLabel(MAIN_BRANCH_ID) },
  { id: "u-supervisor", email: "supervisor1@wellspring.ph", name: "Jannel Pondoyo", role: UserRole.STORE_SUPERVISOR, branchId: "branch-ws05", branchName: branchLabel("branch-ws05") },
];

interface CatalogItem {
  key: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  cost: number;
  reorderPoint: number;
  prescription: boolean;
  baseStock: number;
}

const CATALOG: CatalogItem[] = [
  { key: "amox", sku: "AMOX-500", barcode: "4801234500012", name: "Amoxicillin 500 mg capsule", category: "Prescription", unit: "capsule", price: 12.5, cost: 7.8, reorderPoint: 40, prescription: true, baseStock: 90 },
  { key: "para", sku: "PARA-500", barcode: "4801234500029", name: "Paracetamol 500 mg tablet", category: "OTC medicine", unit: "tablet", price: 6.5, cost: 3.75, reorderPoint: 50, prescription: false, baseStock: 320 },
  { key: "vitc", sku: "VITC-500", barcode: "4801234500036", name: "Vitamin C 500 mg tablet", category: "Vitamins", unit: "tablet", price: 9.75, cost: 5.5, reorderPoint: 30, prescription: false, baseStock: 130 },
  { key: "bioflu", sku: "BIOFLU", barcode: "4801234500043", name: "Bioflu tablet", category: "OTC medicine", unit: "tablet", price: 8.25, cost: 4.9, reorderPoint: 40, prescription: false, baseStock: 70 },
  { key: "alcohol", sku: "ALC-70-500", barcode: "4801234500050", name: "Isopropyl alcohol 70% · 500 ml", category: "Personal care", unit: "bottle", price: 89, cost: 52, reorderPoint: 20, prescription: false, baseStock: 110 },
  { key: "mask", sku: "MASK-50", barcode: "4801234500067", name: "Surgical face mask · 50 pieces", category: "Medical supplies", unit: "box", price: 149, cost: 90, reorderPoint: 15, prescription: false, baseStock: 40 },
  { key: "losa", sku: "LOSA-50", barcode: "4801234500074", name: "Losartan 50 mg tablet", category: "Prescription", unit: "tablet", price: 14.5, cost: 8.2, reorderPoint: 25, prescription: true, baseStock: 100 },
  { key: "cet", sku: "CET-10", barcode: "4801234500081", name: "Cetirizine 10 mg tablet", category: "OTC medicine", unit: "tablet", price: 7.25, cost: 3.9, reorderPoint: 20, prescription: false, baseStock: 150 },
  { key: "mefe", sku: "MEFE-500", barcode: "4801234500098", name: "Mefenamic acid 500 mg capsule", category: "Prescription", unit: "capsule", price: 11.75, cost: 6.6, reorderPoint: 25, prescription: true, baseStock: 85 },
  { key: "ors", sku: "ORS-1", barcode: "4801234500104", name: "Oral rehydration salts sachet", category: "OTC medicine", unit: "sachet", price: 22, cost: 12.5, reorderPoint: 30, prescription: false, baseStock: 120 },
  { key: "diapers", sku: "BABY-DIP-36", barcode: "4801234500111", name: "Newborn diapers · 36 pieces", category: "Baby care", unit: "pack", price: 299, cost: 198, reorderPoint: 12, prescription: false, baseStock: 36 },
  { key: "thermo", sku: "THERMO-DG", barcode: "4801234500128", name: "Digital thermometer", category: "Medical supplies", unit: "unit", price: 349, cost: 215, reorderPoint: 8, prescription: false, baseStock: 22 },
];

const BRANCH_STOCK_FACTOR: Record<string, number> = {
  WS01: 1,
  WS02: 0.72,
  WS03: 0.55,
  WS04: 0.48,
  WS05: 0.62,
  WS06: 0.36,
  WS07: 0.3,
  WS08: 0.26,
};

const STOCK_OVERRIDES: Record<string, Record<string, number>> = {
  WS01: { "VITC-500": 26, "MASK-50": 8, "BIOFLU": 12 },
  WS07: { "LOSA-50": 18, "ORS-1": 14 },
};

function calendarDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function isoDaysAgo(days: number, hour = 10): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 15 + (days % 5) * 7, 0, 0);
  return date.toISOString();
}

function buildBatches(item: CatalogItem, total: number, branchesBefore: number): BatchRecord[] {
  const firstQuantity = Math.max(1, Math.round(total * 0.62));
  const secondQuantity = total - firstQuantity;
  const prefix = item.sku.split("-")[0];
  const nearExpiry = item.key === "bioflu" ? 26 : item.key === "vitc" ? 88 : null;
  const firstExpiry = nearExpiry ?? 430 + Number(item.key.length) * 11 + branchesBefore * 5;
  const secondExpiry = 245 + item.key.length * 9 + branchesBefore * 3;
  const batches: BatchRecord[] = [{
    id: `batch-${item.key}-${branchesBefore}-a`,
    batchNumber: `${prefix}-${String(CURRENT_YEAR).slice(2)}-${String(100 + branchesBefore * 11 + item.key.length).padStart(3, "0")}`,
    expiry: calendarDaysFromNow(firstExpiry),
    quantity: firstQuantity,
    receivedAt: calendarDaysFromNow(-(38 + branchesBefore * 2)),
  }];
  if (secondQuantity > 0) {
    batches.push({
      id: `batch-${item.key}-${branchesBefore}-b`,
      batchNumber: `${prefix}-${String(CURRENT_YEAR).slice(2)}-${String(160 + branchesBefore * 7 + item.key.length).padStart(3, "0")}`,
      expiry: calendarDaysFromNow(secondExpiry),
      quantity: secondQuantity,
      receivedAt: calendarDaysFromNow(-(12 + branchesBefore)),
    });
  }
  return batches;
}

function buildBranchInventory(branchCode: string, branchIndex: number): ProductRecord[] {
  const factor = BRANCH_STOCK_FACTOR[branchCode] ?? 0.3;
  return CATALOG.map((item) => {
    const override = STOCK_OVERRIDES[branchCode]?.[item.sku];
    const total = override ?? Math.max(6, Math.round(item.baseStock * factor));
    const batches = buildBatches(item, total, branchIndex);
    return syncProduct({
      id: `p-${branchCode.toLowerCase()}-${item.key}`,
      sku: item.sku,
      barcode: item.barcode,
      name: item.name,
      category: item.category,
      unit: item.unit,
      price: item.price,
      cost: item.cost,
      stock: 0,
      reorderPoint: item.reorderPoint,
      batch: "",
      expiry: "",
      prescription: item.prescription,
      batches,
    });
  });
}

export const INITIAL_INVENTORIES: Record<string, ProductRecord[]> = Object.fromEntries(
  BRANCHES.map((branch, index) => [branch.id, buildBranchInventory(branch.code, index)]),
);

export const INITIAL_SUPPLIERS: SupplierRecord[] = [
  {
    id: "sup-medicore", code: "SUP-01", name: "MediCore Distributors", contactPerson: "Liza Fernandez",
    phone: "(082) 221-4488", email: "orders@medicore.ph", address: "Km 5 J.P. Laurel Ave, Davao City",
    terms: "30 days", leadTimeDays: 3, category: "Prescription & cold chain", accredited: true, rating: 4.8,
    lastDelivery: calendarDaysFromNow(-1), notes: "Cold-chain deliveries arrive with a temperature log; verify the data logger before signing the GRN.",
  },
  {
    id: "sup-pharma", code: "SUP-02", name: "Pharma Supply Inc.", contactPerson: "Dennis Ocampo",
    phone: "(082) 225-9071", email: "sales@pharmasupply.ph", address: "Magsaysay Ave, Davao City",
    terms: "15 days", leadTimeDays: 5, category: "OTC medicine", accredited: true, rating: 4.5,
    lastDelivery: calendarDaysFromNow(-3), notes: "Delivers in sealed cases; short-shipments are replaced on the next cycle without extra freight.",
  },
  {
    id: "sup-healthpoint", code: "SUP-03", name: "HealthPoint Trading", contactPerson: "Karen Uy",
    phone: "(082) 227-3310", email: "karen@healthpoint.ph", address: "Bajada, Davao City",
    terms: "30 days", leadTimeDays: 7, category: "Personal care", accredited: true, rating: 4.2,
    lastDelivery: calendarDaysFromNow(-6), notes: "Volume discounts start at 50 cases per SKU; request a quote before ordering above that tier.",
  },
  {
    id: "sup-davaomed", code: "SUP-04", name: "Davao Medical Depot", contactPerson: "Arnel Salazar",
    phone: "(082) 234-1180", email: "arnel@davaomeddepot.ph", address: "Lanang, Davao City",
    terms: "45 days", leadTimeDays: 4, category: "Medical supplies", accredited: true, rating: 4.6,
    lastDelivery: calendarDaysFromNow(-2), notes: "Includes calibration certificates for thermometers and blood pressure units.",
  },
  {
    id: "sup-nutrilife", code: "SUP-05", name: "NutriLife Distribution", contactPerson: "Grace Lim",
    phone: "(082) 228-6652", email: "grace@nutrilife.ph", address: "Matina, Davao City",
    terms: "30 days", leadTimeDays: 6, category: "Vitamins & supplements", accredited: true, rating: 3.9,
    lastDelivery: calendarDaysFromNow(-9), notes: "Frequently splits vitamin deliveries; confirm batch and expiry per carton at receiving.",
  },
  {
    id: "sup-mindanao", code: "SUP-06", name: "Mindanao Pharma Link", contactPerson: "Rey Tolentino",
    phone: "(084) 216-7789", email: "rey@mpharmalink.ph", address: "Tagum City",
    terms: "60 days", leadTimeDays: 10, category: "Prescription", accredited: false, rating: 3.4,
    lastDelivery: calendarDaysFromNow(-21), notes: "FDA licence renewal pending. Purchasing is blocked until accreditation is restored.",
  },
];

export const SUPPLIERS = INITIAL_SUPPLIERS.map((supplier) => supplier.name);

export const INITIAL_LOYALTY_MEMBERS: LoyaltyMemberRecord[] = [
  { id: "lm-001", name: "Maria Santos", phone: "09171234567", points: 148, joinedAt: "2024-02-11", tier: "SILVER" },
  { id: "lm-002", name: "Carlo Reyes", phone: "09182345678", points: 62, joinedAt: "2025-06-03", tier: "CLASSIC" },
  { id: "lm-003", name: "Ana Lim", phone: "09293456789", points: 412, joinedAt: "2023-09-27", tier: "GOLD" },
  { id: "lm-004", name: "Jimmy Uy", phone: "09384567890", points: 24, joinedAt: "2026-01-15", tier: "CLASSIC" },
];

interface SaleSpec {
  branchCode: string;
  serial: number;
  daysAgo: number;
  hour: number;
  cashier: string;
  customerType: CustomerType;
  paymentMethod: PaymentMethod;
  items: Array<{ sku: string; quantity: number }>;
  status?: SaleStatus;
  loyaltyPhone?: string;
  voidReason?: string;
  refundReason?: string;
}

const SALE_SPECS: SaleSpec[] = [
  { branchCode: "WS01", serial: 1001, daysAgo: 0, hour: 9, cashier: "Frankie Pelayo", customerType: "REGULAR", paymentMethod: PaymentMethod.CASH, items: [{ sku: "PARA-500", quantity: 4 }] },
  { branchCode: "WS01", serial: 1002, daysAgo: 0, hour: 8, cashier: "Frankie Pelayo", customerType: "SENIOR", paymentMethod: PaymentMethod.CASH, items: [{ sku: "LOSA-50", quantity: 10 }] },
  { branchCode: "WS01", serial: 1003, daysAgo: 0, hour: 10, cashier: "Frankie Pelayo", customerType: "LOYALTY", paymentMethod: PaymentMethod.E_WALLET, items: [{ sku: "VITC-500", quantity: 2 }], loyaltyPhone: "09171234567" },
  { branchCode: "WS02", serial: 1004, daysAgo: 1, hour: 16, cashier: "Mave Ancog", customerType: "REGULAR", paymentMethod: PaymentMethod.E_WALLET, items: [{ sku: "ALC-70-500", quantity: 2 }] },
  { branchCode: "WS03", serial: 1005, daysAgo: 1, hour: 13, cashier: "Mark Punto", customerType: "REGULAR", paymentMethod: PaymentMethod.CARD, items: [{ sku: "MASK-50", quantity: 1 }] },
  { branchCode: "WS05", serial: 1006, daysAgo: 1, hour: 11, cashier: "Jannel Pondoyo", customerType: "PWD", paymentMethod: PaymentMethod.CASH, items: [{ sku: "ORS-1", quantity: 5 }] },
  { branchCode: "WS01", serial: 1007, daysAgo: 2, hour: 11, cashier: "Frankie Pelayo", customerType: "REGULAR", paymentMethod: PaymentMethod.CASH, items: [{ sku: "MEFE-500", quantity: 6 }], status: "REFUNDED", refundReason: "Adverse reaction reported; full refund approved by the branch manager." },
  { branchCode: "WS04", serial: 1008, daysAgo: 2, hour: 15, cashier: "Paolo Sarenas", customerType: "REGULAR", paymentMethod: PaymentMethod.E_WALLET, items: [{ sku: "CET-10", quantity: 6 }] },
  { branchCode: "WS01", serial: 1009, daysAgo: 3, hour: 15, cashier: "Frankie Pelayo", customerType: "REGULAR", paymentMethod: PaymentMethod.CASH, items: [{ sku: "CET-10", quantity: 6 }], status: "VOIDED", voidReason: "Customer cancelled before leaving the counter; items returned to the shelf." },
  { branchCode: "WS06", serial: 1010, daysAgo: 3, hour: 12, cashier: "Nikki Bautista", customerType: "REGULAR", paymentMethod: PaymentMethod.CARD, items: [{ sku: "BABY-DIP-36", quantity: 1 }] },
  { branchCode: "WS01", serial: 1011, daysAgo: 4, hour: 12, cashier: "Frankie Pelayo", customerType: "REGULAR", paymentMethod: PaymentMethod.E_WALLET, items: [{ sku: "BIOFLU", quantity: 5 }] },
  { branchCode: "WS02", serial: 1012, daysAgo: 4, hour: 17, cashier: "Mave Ancog", customerType: "REGULAR", paymentMethod: PaymentMethod.CASH, items: [{ sku: "AMOX-500", quantity: 21 }] },
  { branchCode: "WS05", serial: 1013, daysAgo: 5, hour: 10, cashier: "Jannel Pondoyo", customerType: "REGULAR", paymentMethod: PaymentMethod.CASH, items: [{ sku: "THERMO-DG", quantity: 1 }, { sku: "PARA-500", quantity: 10 }] },
  { branchCode: "WS01", serial: 1014, daysAgo: 5, hour: 10, cashier: "Frankie Pelayo", customerType: "REGULAR", paymentMethod: PaymentMethod.CASH, items: [{ sku: "PARA-500", quantity: 8 }] },
  { branchCode: "WS03", serial: 1015, daysAgo: 6, hour: 14, cashier: "Mark Punto", customerType: "LOYALTY", paymentMethod: PaymentMethod.CARD, items: [{ sku: "VITC-500", quantity: 3 }], loyaltyPhone: "09293456789" },
];

function branchIdFor(code: string): string {
  return BRANCHES.find((branch) => branch.code === code)?.id ?? MAIN_BRANCH_ID;
}

function buildSale(spec: SaleSpec): SaleRecord {
  const branchId = branchIdFor(spec.branchCode);
  const inventory = INITIAL_INVENTORIES[branchId] ?? [];
  const createdAt = isoDaysAgo(spec.daysAgo, spec.hour);
  const lines = spec.items.map((line) => {
    const product = inventory.find((candidate) => candidate.sku === line.sku);
    if (!product) throw new Error(`Missing seed product ${line.sku}`);
    const allocation = allocateFefo(product.batches, line.quantity);
    return { product, quantity: line.quantity, allocations: allocation.allocations };
  });
  const totals = calculateSaleTotals(
    lines.map(({ product, quantity }) => ({ unitPrice: product.price, quantity, discountPerUnit: 0, taxRate: 0.12 })),
    spec.customerType,
  );
  const exempt = spec.customerType === "SENIOR" || spec.customerType === "PWD";
  const isCash = spec.paymentMethod === PaymentMethod.CASH;
  const cashTendered = isCash ? Math.ceil(totals.total / 50) * 50 : undefined;

  return {
    id: `sale-${spec.serial}`,
    receiptNumber: `WS-${CURRENT_YEAR}-0${spec.serial}`,
    createdAt,
    branchId,
    branchCode: spec.branchCode,
    cashier: spec.cashier,
    customerType: spec.customerType,
    paymentMethod: spec.paymentMethod,
    items: lines.map(({ product, quantity }) => ({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity,
      unitPrice: product.price,
      lineTotal: Math.round((product.price * quantity * (exempt ? 0.8 : 1.12)) * 100) / 100,
      batchAllocations: lines.find((line) => line.product.id === product.id)?.allocations ?? [],
      prescription: product.prescription,
    })),
    subtotal: totals.subtotal,
    discount: totals.discount,
    vat: totals.vat,
    total: totals.total,
    cashTendered,
    change: isCash && cashTendered !== undefined ? Math.round((cashTendered - totals.total) * 100) / 100 : undefined,
    paymentReference: spec.paymentMethod === PaymentMethod.CARD ? "CARD-AUTH-88301" : spec.paymentMethod === PaymentMethod.E_WALLET ? "GCASH-7741208" : undefined,
    loyaltyPhone: spec.loyaltyPhone,
    loyaltyPointsEarned: spec.customerType === "LOYALTY" ? Math.floor(totals.total / 50) : 0,
    loyaltyPointsRedeemed: 0,
    loyaltyDiscount: 0,
    status: spec.status ?? "COMPLETED",
    offline: false,
    voidedAt: spec.status === "VOIDED" ? createdAt : undefined,
    voidedBy: spec.status === "VOIDED" ? "Frankie Pelayo" : undefined,
    voidReason: spec.voidReason,
    refundedAt: spec.status === "REFUNDED" ? isoDaysAgo(spec.daysAgo - 1, 9) : undefined,
    refundedBy: spec.status === "REFUNDED" ? "Rick Perez" : undefined,
    refundReason: spec.refundReason,
    refundAmount: spec.status === "REFUNDED" ? totals.total : undefined,
  };
}

export const INITIAL_SALES: SaleRecord[] = SALE_SPECS
  .map(buildSale)
  .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

function poItem(branchId: string, sku: string, quantity: number, unitCost: number) {
  const product = (INITIAL_INVENTORIES[branchId] ?? []).find((candidate) => candidate.sku === sku);
  return { productId: product?.id ?? sku, productName: product?.name ?? sku, quantity, unitCost };
}

export const INITIAL_PURCHASE_ORDERS: PurchaseOrderRecord[] = [
  {
    id: "po-001", poNumber: "PO-2026-0041", supplierId: "sup-pharma", supplier: "Pharma Supply Inc.",
    branchId: MAIN_BRANCH_ID, createdAt: isoDaysAgo(2), expectedDate: calendarDaysFromNow(3), status: "SENT",
    total: 5740,
    items: [poItem(MAIN_BRANCH_ID, "BIOFLU", 400, 4.9), poItem(MAIN_BRANCH_ID, "MASK-50", 42, 90)],
  },
  {
    id: "po-002", poNumber: "PO-2026-0040", supplierId: "sup-medicore", supplier: "MediCore Distributors",
    branchId: MAIN_BRANCH_ID, createdAt: isoDaysAgo(6), expectedDate: calendarDaysFromNow(-1), status: "RECEIVED",
    total: 12500,
    items: [poItem(MAIN_BRANCH_ID, "VITC-500", 2000, 5.5), poItem(MAIN_BRANCH_ID, "CET-10", 500, 3)],
    grn: {
      grnNumber: "GRN-2026-0098", invoiceNumber: "MC-88214", receivedAt: isoDaysAgo(1, 8),
      receivedBy: "Mark Punto", notes: "All lines complete; temperature log attached for the Rx tote.",
      lines: [
        { productId: poItem(MAIN_BRANCH_ID, "VITC-500", 1, 0).productId, batchNumber: "VTC-26-201", expiry: calendarDaysFromNow(500), quantity: 2000 },
        { productId: poItem(MAIN_BRANCH_ID, "CET-10", 1, 0).productId, batchNumber: "CET-26-205", expiry: calendarDaysFromNow(610), quantity: 500 },
      ],
    },
  },
  {
    id: "po-003", poNumber: "PO-2026-0042", supplierId: "sup-medicore", supplier: "MediCore Distributors",
    branchId: "branch-ws02", createdAt: isoDaysAgo(0), expectedDate: calendarDaysFromNow(5), status: "DRAFT",
    total: 3120, items: [poItem("branch-ws02", "AMOX-500", 400, 7.8)],
  },
  {
    id: "po-004", poNumber: "PO-2026-0043", supplierId: "sup-healthpoint", supplier: "HealthPoint Trading",
    branchId: "branch-ws05", createdAt: isoDaysAgo(3), expectedDate: calendarDaysFromNow(4), status: "SENT",
    total: 5280, items: [poItem("branch-ws05", "ALC-70-500", 60, 52), poItem("branch-ws05", "MASK-50", 24, 90)],
  },
  {
    id: "po-005", poNumber: "PO-2026-0039", supplierId: "sup-davaomed", supplier: "Davao Medical Depot",
    branchId: "branch-ws03", createdAt: isoDaysAgo(9), expectedDate: calendarDaysFromNow(-4), status: "RECEIVED",
    total: 4300, items: [poItem("branch-ws03", "THERMO-DG", 20, 215)],
    grn: {
      grnNumber: "GRN-2026-0095", invoiceNumber: "DMD-4471", receivedAt: isoDaysAgo(4, 15),
      receivedBy: "Mark Punto", notes: "Two units short; supplier credited the difference on invoice DMD-4471.",
      lines: [{ productId: poItem("branch-ws03", "THERMO-DG", 1, 0).productId, batchNumber: "THE-26-311", expiry: calendarDaysFromNow(900), quantity: 18 }],
    },
  },
];

export const INITIAL_STOCK_MOVEMENTS: StockMovementRecord[] = [
  {
    id: "mv-001", branchId: MAIN_BRANCH_ID, productId: "p-ws01-para", productName: "Paracetamol 500 mg tablet",
    batchNumber: "PAR-26-105", type: "SALE", quantity: -4, balance: 318, reason: `WS-${CURRENT_YEAR}-01001`,
    actor: "Frankie Pelayo", createdAt: isoDaysAgo(0, 9),
  },
  {
    id: "mv-002", branchId: MAIN_BRANCH_ID, productId: "p-ws01-vitc", productName: "Vitamin C 500 mg tablet",
    batchNumber: "VTC-26-201", type: "RECEIPT", quantity: 2000, balance: 2026, reason: "GRN-2026-0098",
    actor: "Mark Punto", createdAt: isoDaysAgo(1, 8),
  },
  {
    id: "mv-003", branchId: "branch-ws03", productId: "p-ws03-thermo", productName: "Digital thermometer",
    batchNumber: "THE-26-311", type: "RECEIPT", quantity: 18, balance: 29, reason: "GRN-2026-0095",
    actor: "Mark Punto", createdAt: isoDaysAgo(4, 15),
  },
  {
    id: "mv-004", branchId: MAIN_BRANCH_ID, productId: "p-ws01-mask", productName: "Surgical face mask · 50 pieces",
    batchNumber: "MSK-26-107", type: "ADJUSTMENT", quantity: -3, balance: 8, reason: "Damaged stock written off after a water leak",
    actor: "Mark Punto", createdAt: isoDaysAgo(2, 14),
  },
];

export const INITIAL_ADMIN_USERS: AdminUserRecord[] = DEMO_USERS.map((user, index) => ({
  ...user,
  active: index !== 7,
  lastLogin: isoDaysAgo(index % 4, 8 + (index % 5)),
}));

export const INITIAL_AUDIT_LOG: AuditRecord[] = [
  {
    id: "audit-seed-1",
    branchId: MAIN_BRANCH_ID,
    action: "Goods received",
    detail: "GRN-2026-0098 · PO-2026-0040 · 2 lines checked",
    actor: "Mark Punto",
    createdAt: isoDaysAgo(1, 8),
  },
  {
    id: "audit-seed-2",
    branchId: MAIN_BRANCH_ID,
    action: "Refund approved",
    detail: "WS-2026-01007 · ₱56.10 · adverse reaction",
    actor: "Rick Perez",
    createdAt: isoDaysAgo(1, 9),
  },
  {
    id: "audit-seed-3",
    branchId: "branch-ws03",
    action: "Stock count recorded",
    detail: "THERMO-DG · 29 units · cycle count",
    actor: "Mark Punto",
    createdAt: isoDaysAgo(2, 16),
  },
  {
    id: "audit-seed-4",
    branchId: undefined,
    action: "Supplier accreditation flagged",
    detail: "Mindanao Pharma Link · FDA licence renewal pending",
    actor: "Asaph Ildefonso",
    createdAt: isoDaysAgo(3, 11),
  },
];
