/**
 * WellSpring POS/Inventory — Shared Types & Constants
 * Single source of truth for types used by both frontend and backend.
 */

import { z } from "zod";

// ============ ENUMS ============

export const UserRole = {
  CASHIER: "CASHIER",
  STORE_SUPERVISOR: "STORE_SUPERVISOR",
  PHARMACIST: "PHARMACIST",
  INVENTORY_STAFF: "INVENTORY_STAFF",
  PURCHASING_OFFICER: "PURCHASING_OFFICER",
  BRANCH_MANAGER: "BRANCH_MANAGER",
  HEAD_OFFICE_MANAGER: "HEAD_OFFICE_MANAGER",
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.CASHIER]: 10,
  [UserRole.INVENTORY_STAFF]: 20,
  [UserRole.PHARMACIST]: 25,
  [UserRole.STORE_SUPERVISOR]: 30,
  [UserRole.PURCHASING_OFFICER]: 30,
  [UserRole.BRANCH_MANAGER]: 40,
  [UserRole.HEAD_OFFICE_MANAGER]: 50,
  [UserRole.SYSTEM_ADMIN]: 100,
};

export const PaymentMethod = {
  CASH: "CASH",
  CARD: "CARD",
  E_WALLET: "E_WALLET",
  INSTALLMENT: "INSTALLMENT",
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const OrderStatus = {
  PENDING: "PENDING",
  PREPARING: "PREPARING",
  READY: "READY",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const POStatus = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  PARTIAL: "PARTIAL",
  RECEIVED: "RECEIVED",
  CANCELLED: "CANCELLED",
} as const;

export type POStatus = (typeof POStatus)[keyof typeof POStatus];

export const GRNStatus = {
  PENDING: "PENDING",
  RECEIVED: "RECEIVED",
  DISCREPANT: "DISCREPANT",
} as const;

export type GRNStatus = (typeof GRNStatus)[keyof typeof GRNStatus];

export const StockMovementType = {
  SALE: "SALE",
  RETURN: "RETURN",
  RECEIPT: "RECEIPT",
  TRANSFER_IN: "TRANSFER_IN",
  TRANSFER_OUT: "TRANSFER_OUT",
  ADJUSTMENT: "ADJUSTMENT",
  EXPIRY: "EXPIRY",
  DAMAGE: "DAMAGE",
} as const;

export type StockMovementType = (typeof StockMovementType)[keyof typeof StockMovementType];

// ============ ZOD SCHEMAS (for validation) ============

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.nativeEnum(UserRole),
  branchId: z.string().uuid().nullable(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const BranchSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(100),
  address: z.string().max(255),
  phone: z.string().max(20).optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ProductSchema = z.object({
  id: z.string().uuid(),
  sku: z.string().min(1).max(50),
  barcode: z.string().max(50).optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  categoryId: z.string().uuid(),
  unitOfMeasure: z.string().max(20),
  standardPrice: z.number().positive(),
  costPrice: z.number().positive(),
  isPrescriptionOnly: z.boolean().default(false),
  isControlledDrug: z.boolean().default(false),
  isBatchTracked: z.boolean().default(true),
  reorderPoint: z.number().int().nonnegative().default(10),
  safetyStock: z.number().int().nonnegative().default(5),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ProductBatchSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  batchNumber: z.string().min(1).max(50),
  expiryDate: z.date(),
  manufacturingDate: z.date().optional(),
  supplierId: z.string().uuid().optional(),
  receivedDate: z.date(),
  createdAt: z.date(),
});

export const StockLevelSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  branchId: z.string().uuid(),
  batchId: z.string().uuid().nullable(),
  quantityOnHand: z.number().int().default(0),
  quantityCommitted: z.number().int().default(0),
  quantityAvailable: z.number().int().default(0),
  lastUpdated: z.date(),
});

export const SaleSchema = z.object({
  id: z.string().uuid(),
  branchId: z.string().uuid(),
  cashierId: z.string().uuid(),
  status: z.nativeEnum(OrderStatus),
  subtotal: z.number().nonnegative(),
  discountTotal: z.number().nonnegative().default(0),
  taxTotal: z.number().nonnegative().default(0),
  grandTotal: z.number().nonnegative(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  paymentReference: z.string().max(100).optional(),
  customerName: z.string().max(100).optional(),
  customerType: z.enum(["REGULAR", "SENIOR", "PWD", "LOYALTY"]).optional(),
  loyaltyPointsEarned: z.number().int().default(0),
  loyaltyPointsRedeemed: z.number().int().default(0),
  receiptNumber: z.string().max(50),
  receiptSerial: z.string().max(50),
  isOffline: z.boolean().default(false),
  syncedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const SaleItemSchema = z.object({
  id: z.string().uuid(),
  saleId: z.string().uuid(),
  productId: z.string().uuid(),
  batchId: z.string().uuid().nullable(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  discount: z.number().nonnegative().default(0),
  taxRate: z.number().nonnegative().default(0.12),
  lineTotal: z.number().nonnegative(),
  isPrescription: z.boolean().default(false),
  prescriptionId: z.string().uuid().nullable(),
});

export const SupplierSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  contactPerson: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(255).optional(),
  paymentTerms: z.string().max(50).optional(),
  leadTimeDays: z.number().int().nonnegative().default(7),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const PurchaseOrderSchema = z.object({
  id: z.string().uuid(),
  poNumber: z.string().max(50),
  supplierId: z.string().uuid(),
  branchId: z.string().uuid(),
  status: z.nativeEnum(POStatus),
  orderDate: z.date(),
  expectedDate: z.date().optional(),
  subtotal: z.number().nonnegative(),
  taxTotal: z.number().nonnegative().default(0),
  grandTotal: z.number().nonnegative(),
  notes: z.string().max(1000).optional(),
  createdBy: z.string().uuid(),
  approvedBy: z.string().uuid().nullable(),
  approvedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const POItemSchema = z.object({
  id: z.string().uuid(),
  poId: z.string().uuid(),
  productId: z.string().uuid(),
  quantityOrdered: z.number().int().positive(),
  quantityReceived: z.number().int().nonnegative().default(0),
  unitCost: z.number().positive(),
  taxRate: z.number().nonnegative().default(0.12),
  lineTotal: z.number().nonnegative(),
});

export const GRNSchema = z.object({
  id: z.string().uuid(),
  grnNumber: z.string().max(50),
  poId: z.string().uuid(),
  branchId: z.string().uuid(),
  supplierId: z.string().uuid(),
  status: z.nativeEnum(GRNStatus),
  receivedDate: z.date(),
  receivedBy: z.string().uuid(),
  notes: z.string().max(1000).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const GRNItemSchema = z.object({
  id: z.string().uuid(),
  grnId: z.string().uuid(),
  poItemId: z.string().uuid(),
  productId: z.string().uuid(),
  batchId: z.string().uuid().nullable(),
  batchNumber: z.string().max(50),
  expiryDate: z.date(),
  quantityReceived: z.number().int().positive(),
  unitCost: z.number().positive(),
  qualityCheck: z.enum(["PASSED", "FAILED", "PENDING"]).default("PENDING"),
  notes: z.string().max(500).optional(),
});

export const StockCountSchema = z.object({
  id: z.string().uuid(),
  branchId: z.string().uuid(),
  productId: z.string().uuid(),
  batchId: z.string().uuid().nullable(),
  systemQuantity: z.number().int(),
  actualQuantity: z.number().int(),
  variance: z.number().int(),
  reasonCode: z.enum(["DAMAGE", "THEFT", "EXPIRY", "MISCOUNT", "TRANSFER", "OTHER"]).optional(),
  notes: z.string().max(500).optional(),
  countedBy: z.string().uuid(),
  approvedBy: z.string().uuid().nullable(),
  countedAt: z.date(),
});

export const StockTransferSchema = z.object({
  id: z.string().uuid(),
  transferNumber: z.string().max(50),
  fromBranchId: z.string().uuid(),
  toBranchId: z.string().uuid(),
  status: z.enum(["PENDING", "APPROVED", "SHIPPED", "RECEIVED", "CANCELLED"]),
  requestedBy: z.string().uuid(),
  approvedBy: z.string().uuid().nullable(),
  shippedBy: z.string().uuid().nullable(),
  receivedBy: z.string().uuid().nullable(),
  requestedAt: z.date(),
  approvedAt: z.date().nullable(),
  shippedAt: z.date().nullable(),
  receivedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const TransferItemSchema = z.object({
  id: z.string().uuid(),
  transferId: z.string().uuid(),
  productId: z.string().uuid(),
  batchId: z.string().uuid().nullable(),
  quantity: z.number().int().positive(),
});

export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  branchId: z.string().uuid().nullable(),
  action: z.string().min(1).max(100),
  entityType: z.string().max(50),
  entityId: z.string().max(100).nullable(),
  before: z.record(z.unknown()).nullable(),
  after: z.record(z.unknown()).nullable(),
  ipAddress: z.string().max(45).optional(),
  userAgent: z.string().max(255).optional(),
  createdAt: z.date(),
});

// ============ TYPE EXPORTS ============

export type User = z.infer<typeof UserSchema>;
export type Branch = z.infer<typeof BranchSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type ProductBatch = z.infer<typeof ProductBatchSchema>;
export type StockLevel = z.infer<typeof StockLevelSchema>;
export type Sale = z.infer<typeof SaleSchema>;
export type SaleItem = z.infer<typeof SaleItemSchema>;
export type Supplier = z.infer<typeof SupplierSchema>;
export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>;
export type POItem = z.infer<typeof POItemSchema>;
export type GRN = z.infer<typeof GRNSchema>;
export type GRNItem = z.infer<typeof GRNItemSchema>;
export type StockCount = z.infer<typeof StockCountSchema>;
export type StockTransfer = z.infer<typeof StockTransferSchema>;
export type TransferItem = z.infer<typeof TransferItemSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;

// ============ API RESPONSE TYPES ============

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============ PERMISSIONS ============

export const PERMISSIONS = {
  // Sales
  "sales:create": [UserRole.CASHIER, UserRole.STORE_SUPERVISOR, UserRole.PHARMACIST],
  "sales:read": [UserRole.CASHIER, UserRole.STORE_SUPERVISOR, UserRole.PHARMACIST, UserRole.INVENTORY_STAFF, UserRole.BRANCH_MANAGER, UserRole.HEAD_OFFICE_MANAGER, UserRole.SYSTEM_ADMIN],
  "sales:void": [UserRole.CASHIER, UserRole.STORE_SUPERVISOR],
  "sales:refund": [UserRole.STORE_SUPERVISOR, UserRole.BRANCH_MANAGER],
  "sales:override_price": [UserRole.STORE_SUPERVISOR],

  // Inventory
  "inventory:read": [UserRole.INVENTORY_STAFF, UserRole.STORE_SUPERVISOR, UserRole.BRANCH_MANAGER, UserRole.HEAD_OFFICE_MANAGER, UserRole.SYSTEM_ADMIN],
  "inventory:count": [UserRole.INVENTORY_STAFF],
  "inventory:adjust": [UserRole.INVENTORY_STAFF, UserRole.STORE_SUPERVISOR],
  "inventory:transfer": [UserRole.INVENTORY_STAFF, UserRole.BRANCH_MANAGER],
  "inventory:batch_manage": [UserRole.INVENTORY_STAFF, UserRole.PHARMACIST],

  // Purchasing
  "purchasing:read": [UserRole.PURCHASING_OFFICER, UserRole.BRANCH_MANAGER, UserRole.HEAD_OFFICE_MANAGER, UserRole.SYSTEM_ADMIN],
  "purchasing:create_po": [UserRole.PURCHASING_OFFICER],
  "purchasing:approve_po": [UserRole.BRANCH_MANAGER, UserRole.HEAD_OFFICE_MANAGER],
  "purchasing:grn": [UserRole.INVENTORY_STAFF, UserRole.PURCHASING_OFFICER],
  "purchasing:invoice_match": [UserRole.PURCHASING_OFFICER],
  "supplier:manage": [UserRole.PURCHASING_OFFICER, UserRole.SYSTEM_ADMIN],

  // Reports
  "reports:branch_sales": [UserRole.STORE_SUPERVISOR, UserRole.BRANCH_MANAGER],
  "reports:inventory": [UserRole.INVENTORY_STAFF, UserRole.BRANCH_MANAGER, UserRole.HEAD_OFFICE_MANAGER],
  "reports:consolidated": [UserRole.HEAD_OFFICE_MANAGER, UserRole.SYSTEM_ADMIN],
  "reports:accounting_sync": [UserRole.SYSTEM_ADMIN],

  // Admin
  "admin:users": [UserRole.SYSTEM_ADMIN],
  "admin:config": [UserRole.SYSTEM_ADMIN],
  "admin:audit": [UserRole.SYSTEM_ADMIN, UserRole.BRANCH_MANAGER],
} as const;

export function hasPermission(userRole: UserRole, permission: keyof typeof PERMISSIONS): boolean {
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(userRole);
}

// ============ BUSINESS CONSTANTS ============

export const BUSINESS_RULES = {
  VAT_RATE: 0.12,
  SC_PWD_DISCOUNT_RATE: 0.20,
  MIN_ORDER_AMOUNT: 100, // PHP
  DELIVERY_FEE_BASE: 30, // PHP first 3km
  DELIVERY_FEE_PER_KM: 10, // PHP per extra km
  DELIVERY_RADIUS_KM: 7,
  RECEIPT_SERIAL_PREFIX: "WS",
  OFFLINE_QUEUE_MAX_AGE_HOURS: 48,
  STOCK_COUNT_TOLERANCE_PCT: 0.02,
  FULL_COUNT_TOLERANCE_PCT: 0.01,
  TRANSFER_APPROVAL_THRESHOLD_1: 10000, // PHP - Staff can approve
  TRANSFER_APPROVAL_THRESHOLD_2: 50000, // PHP - Branch Manager
  PAYMENT_AUTH_TIMEOUT_MS: 2000,
  CASH_VARIANCE_INVESTIGATE: 100, // PHP
  AUDIT_RETENTION_YEARS: 10,
  SYNC_RETRY_INTERVAL_MIN: 30,
  SYNC_RETRY_MAX_HOURS: 4,
  BACKUP_INTERVAL_HOURS: 4,
  RTO_HOURS: 1,
  RPO_HOURS: 4,
} as const;