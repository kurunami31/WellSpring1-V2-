"use strict";
/**
 * WellSpring POS/Inventory — Shared Types & Constants
 * Single source of truth for types used by both frontend and backend.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUSINESS_RULES = exports.PERMISSIONS = exports.AuditLogSchema = exports.TransferItemSchema = exports.StockTransferSchema = exports.StockCountSchema = exports.GRNItemSchema = exports.GRNSchema = exports.POItemSchema = exports.PurchaseOrderSchema = exports.SupplierSchema = exports.SaleItemSchema = exports.SaleSchema = exports.StockLevelSchema = exports.ProductBatchSchema = exports.ProductSchema = exports.BranchSchema = exports.UserSchema = exports.StockMovementType = exports.GRNStatus = exports.POStatus = exports.OrderStatus = exports.PaymentMethod = exports.ROLE_HIERARCHY = exports.UserRole = void 0;
exports.hasPermission = hasPermission;
const zod_1 = require("zod");
// ============ ENUMS ============
exports.UserRole = {
    CASHIER: "CASHIER",
    STORE_SUPERVISOR: "STORE_SUPERVISOR",
    PHARMACIST: "PHARMACIST",
    INVENTORY_STAFF: "INVENTORY_STAFF",
    PURCHASING_OFFICER: "PURCHASING_OFFICER",
    BRANCH_MANAGER: "BRANCH_MANAGER",
    HEAD_OFFICE_MANAGER: "HEAD_OFFICE_MANAGER",
    SYSTEM_ADMIN: "SYSTEM_ADMIN",
};
exports.ROLE_HIERARCHY = {
    [exports.UserRole.CASHIER]: 10,
    [exports.UserRole.INVENTORY_STAFF]: 20,
    [exports.UserRole.PHARMACIST]: 25,
    [exports.UserRole.STORE_SUPERVISOR]: 30,
    [exports.UserRole.PURCHASING_OFFICER]: 30,
    [exports.UserRole.BRANCH_MANAGER]: 40,
    [exports.UserRole.HEAD_OFFICE_MANAGER]: 50,
    [exports.UserRole.SYSTEM_ADMIN]: 100,
};
exports.PaymentMethod = {
    CASH: "CASH",
    CARD: "CARD",
    E_WALLET: "E_WALLET",
    INSTALLMENT: "INSTALLMENT",
};
exports.OrderStatus = {
    PENDING: "PENDING",
    PREPARING: "PREPARING",
    READY: "READY",
    DELIVERED: "DELIVERED",
    CANCELLED: "CANCELLED",
    REFUNDED: "REFUNDED",
};
exports.POStatus = {
    DRAFT: "DRAFT",
    SENT: "SENT",
    PARTIAL: "PARTIAL",
    RECEIVED: "RECEIVED",
    CANCELLED: "CANCELLED",
};
exports.GRNStatus = {
    PENDING: "PENDING",
    RECEIVED: "RECEIVED",
    DISCREPANT: "DISCREPANT",
};
exports.StockMovementType = {
    SALE: "SALE",
    RETURN: "RETURN",
    RECEIPT: "RECEIPT",
    TRANSFER_IN: "TRANSFER_IN",
    TRANSFER_OUT: "TRANSFER_OUT",
    ADJUSTMENT: "ADJUSTMENT",
    EXPIRY: "EXPIRY",
    DAMAGE: "DAMAGE",
};
// ============ ZOD SCHEMAS (for validation) ============
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    name: zod_1.z.string().min(1).max(100),
    role: zod_1.z.nativeEnum(exports.UserRole),
    branchId: zod_1.z.string().uuid().nullable(),
    isActive: zod_1.z.boolean().default(true),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.BranchSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    code: zod_1.z.string().min(1).max(10),
    name: zod_1.z.string().min(1).max(100),
    address: zod_1.z.string().max(255),
    phone: zod_1.z.string().max(20).optional(),
    isActive: zod_1.z.boolean().default(true),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.ProductSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    sku: zod_1.z.string().min(1).max(50),
    barcode: zod_1.z.string().max(50).optional(),
    name: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().max(1000).optional(),
    categoryId: zod_1.z.string().uuid(),
    unitOfMeasure: zod_1.z.string().max(20),
    standardPrice: zod_1.z.number().positive(),
    costPrice: zod_1.z.number().positive(),
    isPrescriptionOnly: zod_1.z.boolean().default(false),
    isControlledDrug: zod_1.z.boolean().default(false),
    isBatchTracked: zod_1.z.boolean().default(true),
    reorderPoint: zod_1.z.number().int().nonnegative().default(10),
    safetyStock: zod_1.z.number().int().nonnegative().default(5),
    isActive: zod_1.z.boolean().default(true),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.ProductBatchSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    productId: zod_1.z.string().uuid(),
    batchNumber: zod_1.z.string().min(1).max(50),
    expiryDate: zod_1.z.date(),
    manufacturingDate: zod_1.z.date().optional(),
    supplierId: zod_1.z.string().uuid().optional(),
    receivedDate: zod_1.z.date(),
    createdAt: zod_1.z.date(),
});
exports.StockLevelSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    productId: zod_1.z.string().uuid(),
    branchId: zod_1.z.string().uuid(),
    batchId: zod_1.z.string().uuid().nullable(),
    quantityOnHand: zod_1.z.number().int().default(0),
    quantityCommitted: zod_1.z.number().int().default(0),
    quantityAvailable: zod_1.z.number().int().default(0),
    lastUpdated: zod_1.z.date(),
});
exports.SaleSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    branchId: zod_1.z.string().uuid(),
    cashierId: zod_1.z.string().uuid(),
    status: zod_1.z.nativeEnum(exports.OrderStatus),
    subtotal: zod_1.z.number().nonnegative(),
    discountTotal: zod_1.z.number().nonnegative().default(0),
    taxTotal: zod_1.z.number().nonnegative().default(0),
    grandTotal: zod_1.z.number().nonnegative(),
    paymentMethod: zod_1.z.nativeEnum(exports.PaymentMethod),
    paymentReference: zod_1.z.string().max(100).optional(),
    customerName: zod_1.z.string().max(100).optional(),
    customerType: zod_1.z.enum(["REGULAR", "SENIOR", "PWD", "LOYALTY"]).optional(),
    loyaltyPointsEarned: zod_1.z.number().int().default(0),
    loyaltyPointsRedeemed: zod_1.z.number().int().default(0),
    receiptNumber: zod_1.z.string().max(50),
    receiptSerial: zod_1.z.string().max(50),
    isOffline: zod_1.z.boolean().default(false),
    syncedAt: zod_1.z.date().nullable(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.SaleItemSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    saleId: zod_1.z.string().uuid(),
    productId: zod_1.z.string().uuid(),
    batchId: zod_1.z.string().uuid().nullable(),
    quantity: zod_1.z.number().int().positive(),
    unitPrice: zod_1.z.number().positive(),
    discount: zod_1.z.number().nonnegative().default(0),
    taxRate: zod_1.z.number().nonnegative().default(0.12),
    lineTotal: zod_1.z.number().nonnegative(),
    isPrescription: zod_1.z.boolean().default(false),
    prescriptionId: zod_1.z.string().uuid().nullable(),
});
exports.SupplierSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    code: zod_1.z.string().min(1).max(20),
    name: zod_1.z.string().min(1).max(200),
    contactPerson: zod_1.z.string().max(100).optional(),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().max(20).optional(),
    address: zod_1.z.string().max(255).optional(),
    paymentTerms: zod_1.z.string().max(50).optional(),
    leadTimeDays: zod_1.z.number().int().nonnegative().default(7),
    isActive: zod_1.z.boolean().default(true),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.PurchaseOrderSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    poNumber: zod_1.z.string().max(50),
    supplierId: zod_1.z.string().uuid(),
    branchId: zod_1.z.string().uuid(),
    status: zod_1.z.nativeEnum(exports.POStatus),
    orderDate: zod_1.z.date(),
    expectedDate: zod_1.z.date().optional(),
    subtotal: zod_1.z.number().nonnegative(),
    taxTotal: zod_1.z.number().nonnegative().default(0),
    grandTotal: zod_1.z.number().nonnegative(),
    notes: zod_1.z.string().max(1000).optional(),
    createdBy: zod_1.z.string().uuid(),
    approvedBy: zod_1.z.string().uuid().nullable(),
    approvedAt: zod_1.z.date().nullable(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.POItemSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    poId: zod_1.z.string().uuid(),
    productId: zod_1.z.string().uuid(),
    quantityOrdered: zod_1.z.number().int().positive(),
    quantityReceived: zod_1.z.number().int().nonnegative().default(0),
    unitCost: zod_1.z.number().positive(),
    taxRate: zod_1.z.number().nonnegative().default(0.12),
    lineTotal: zod_1.z.number().nonnegative(),
});
exports.GRNSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    grnNumber: zod_1.z.string().max(50),
    poId: zod_1.z.string().uuid(),
    branchId: zod_1.z.string().uuid(),
    supplierId: zod_1.z.string().uuid(),
    status: zod_1.z.nativeEnum(exports.GRNStatus),
    receivedDate: zod_1.z.date(),
    receivedBy: zod_1.z.string().uuid(),
    notes: zod_1.z.string().max(1000).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.GRNItemSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    grnId: zod_1.z.string().uuid(),
    poItemId: zod_1.z.string().uuid(),
    productId: zod_1.z.string().uuid(),
    batchId: zod_1.z.string().uuid().nullable(),
    batchNumber: zod_1.z.string().max(50),
    expiryDate: zod_1.z.date(),
    quantityReceived: zod_1.z.number().int().positive(),
    unitCost: zod_1.z.number().positive(),
    qualityCheck: zod_1.z.enum(["PASSED", "FAILED", "PENDING"]).default("PENDING"),
    notes: zod_1.z.string().max(500).optional(),
});
exports.StockCountSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    branchId: zod_1.z.string().uuid(),
    productId: zod_1.z.string().uuid(),
    batchId: zod_1.z.string().uuid().nullable(),
    systemQuantity: zod_1.z.number().int(),
    actualQuantity: zod_1.z.number().int(),
    variance: zod_1.z.number().int(),
    reasonCode: zod_1.z.enum(["DAMAGE", "THEFT", "EXPIRY", "MISCOUNT", "TRANSFER", "OTHER"]).optional(),
    notes: zod_1.z.string().max(500).optional(),
    countedBy: zod_1.z.string().uuid(),
    approvedBy: zod_1.z.string().uuid().nullable(),
    countedAt: zod_1.z.date(),
});
exports.StockTransferSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    transferNumber: zod_1.z.string().max(50),
    fromBranchId: zod_1.z.string().uuid(),
    toBranchId: zod_1.z.string().uuid(),
    status: zod_1.z.enum(["PENDING", "APPROVED", "SHIPPED", "RECEIVED", "CANCELLED"]),
    requestedBy: zod_1.z.string().uuid(),
    approvedBy: zod_1.z.string().uuid().nullable(),
    shippedBy: zod_1.z.string().uuid().nullable(),
    receivedBy: zod_1.z.string().uuid().nullable(),
    requestedAt: zod_1.z.date(),
    approvedAt: zod_1.z.date().nullable(),
    shippedAt: zod_1.z.date().nullable(),
    receivedAt: zod_1.z.date().nullable(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.TransferItemSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    transferId: zod_1.z.string().uuid(),
    productId: zod_1.z.string().uuid(),
    batchId: zod_1.z.string().uuid().nullable(),
    quantity: zod_1.z.number().int().positive(),
});
exports.AuditLogSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid().nullable(),
    branchId: zod_1.z.string().uuid().nullable(),
    action: zod_1.z.string().min(1).max(100),
    entityType: zod_1.z.string().max(50),
    entityId: zod_1.z.string().max(100).nullable(),
    before: zod_1.z.record(zod_1.z.unknown()).nullable(),
    after: zod_1.z.record(zod_1.z.unknown()).nullable(),
    ipAddress: zod_1.z.string().max(45).optional(),
    userAgent: zod_1.z.string().max(255).optional(),
    createdAt: zod_1.z.date(),
});
// ============ PERMISSIONS ============
exports.PERMISSIONS = {
    // Sales
    "sales:create": [exports.UserRole.CASHIER, exports.UserRole.STORE_SUPERVISOR, exports.UserRole.PHARMACIST],
    "sales:read": [exports.UserRole.CASHIER, exports.UserRole.STORE_SUPERVISOR, exports.UserRole.PHARMACIST, exports.UserRole.INVENTORY_STAFF, exports.UserRole.BRANCH_MANAGER, exports.UserRole.HEAD_OFFICE_MANAGER, exports.UserRole.SYSTEM_ADMIN],
    "sales:void": [exports.UserRole.CASHIER, exports.UserRole.STORE_SUPERVISOR],
    "sales:refund": [exports.UserRole.STORE_SUPERVISOR, exports.UserRole.BRANCH_MANAGER],
    "sales:override_price": [exports.UserRole.STORE_SUPERVISOR],
    // Inventory
    "inventory:read": [exports.UserRole.INVENTORY_STAFF, exports.UserRole.STORE_SUPERVISOR, exports.UserRole.BRANCH_MANAGER, exports.UserRole.HEAD_OFFICE_MANAGER, exports.UserRole.SYSTEM_ADMIN],
    "inventory:count": [exports.UserRole.INVENTORY_STAFF],
    "inventory:adjust": [exports.UserRole.INVENTORY_STAFF, exports.UserRole.STORE_SUPERVISOR],
    "inventory:transfer": [exports.UserRole.INVENTORY_STAFF, exports.UserRole.BRANCH_MANAGER],
    "inventory:batch_manage": [exports.UserRole.INVENTORY_STAFF, exports.UserRole.PHARMACIST],
    // Purchasing
    "purchasing:read": [exports.UserRole.PURCHASING_OFFICER, exports.UserRole.BRANCH_MANAGER, exports.UserRole.HEAD_OFFICE_MANAGER, exports.UserRole.SYSTEM_ADMIN],
    "purchasing:create_po": [exports.UserRole.PURCHASING_OFFICER],
    "purchasing:approve_po": [exports.UserRole.BRANCH_MANAGER, exports.UserRole.HEAD_OFFICE_MANAGER],
    "purchasing:grn": [exports.UserRole.INVENTORY_STAFF, exports.UserRole.PURCHASING_OFFICER],
    "purchasing:invoice_match": [exports.UserRole.PURCHASING_OFFICER],
    "supplier:manage": [exports.UserRole.PURCHASING_OFFICER, exports.UserRole.SYSTEM_ADMIN],
    // Reports
    "reports:branch_sales": [exports.UserRole.STORE_SUPERVISOR, exports.UserRole.BRANCH_MANAGER],
    "reports:inventory": [exports.UserRole.INVENTORY_STAFF, exports.UserRole.BRANCH_MANAGER, exports.UserRole.HEAD_OFFICE_MANAGER],
    "reports:consolidated": [exports.UserRole.HEAD_OFFICE_MANAGER, exports.UserRole.SYSTEM_ADMIN],
    "reports:accounting_sync": [exports.UserRole.SYSTEM_ADMIN],
    // Admin
    "admin:users": [exports.UserRole.SYSTEM_ADMIN],
    "admin:config": [exports.UserRole.SYSTEM_ADMIN],
    "admin:audit": [exports.UserRole.SYSTEM_ADMIN, exports.UserRole.BRANCH_MANAGER],
};
function hasPermission(userRole, permission) {
    return exports.PERMISSIONS[permission].includes(userRole);
}
// ============ BUSINESS CONSTANTS ============
exports.BUSINESS_RULES = {
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
};
//# sourceMappingURL=index.js.map