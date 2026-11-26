import type { PaymentMethod, UserRole } from "@wellspring/shared";
import type { CustomerType } from "@/lib/sales";

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  branchId: string | null;
  branchName: string;
}

export interface BranchRecord {
  id: string;
  code: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  type: "FLAGSHIP" | "BRANCH";
  openedAt: string;
}

export interface BatchRecord {
  id: string;
  batchNumber: string;
  expiry: string;
  quantity: number;
  receivedAt: string;
}

export interface BatchAllocation {
  batchNumber: string;
  expiry: string;
  quantity: number;
}

export interface ProductRecord {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  cost: number;
  stock: number;
  reorderPoint: number;
  batch: string;
  expiry: string;
  prescription: boolean;
  batches: BatchRecord[];
}

export interface CartLine {
  productId: string;
  quantity: number;
}

export interface SaleLineRecord extends CartLine {
  productName: string;
  sku: string;
  unitPrice: number;
  lineTotal: number;
  batchAllocations: BatchAllocation[];
  prescription: boolean;
}

export type SaleStatus = "COMPLETED" | "VOIDED" | "REFUNDED";

export interface SaleRecord {
  id: string;
  receiptNumber: string;
  createdAt: string;
  branchId: string;
  branchCode: string;
  cashier: string;
  customerType: CustomerType;
  paymentMethod: PaymentMethod;
  items: SaleLineRecord[];
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  cashTendered?: number;
  change?: number;
  paymentReference?: string;
  loyaltyPhone?: string;
  loyaltyPointsEarned: number;
  loyaltyPointsRedeemed: number;
  loyaltyDiscount: number;
  status: SaleStatus;
  voidedAt?: string;
  voidedBy?: string;
  voidReason?: string;
  refundedAt?: string;
  refundedBy?: string;
  refundReason?: string;
  refundAmount?: number;
  offline: boolean;
}

export interface GoodsReceiptLine {
  productId: string;
  batchNumber: string;
  expiry: string;
  quantity: number;
}

export interface GoodsReceiptRecord {
  grnNumber: string;
  invoiceNumber: string;
  receivedAt: string;
  receivedBy: string;
  notes?: string;
  lines: GoodsReceiptLine[];
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
}

export interface PurchaseOrderRecord {
  id: string;
  poNumber: string;
  supplierId: string;
  supplier: string;
  branchId: string;
  createdAt: string;
  expectedDate: string;
  status: "DRAFT" | "SENT" | "RECEIVED";
  total: number;
  items: PurchaseOrderItem[];
  grn?: GoodsReceiptRecord;
}

export interface SupplierRecord {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  terms: string;
  leadTimeDays: number;
  category: string;
  accredited: boolean;
  rating: number;
  lastDelivery: string;
  notes: string;
}

export interface LoyaltyMemberRecord {
  id: string;
  name: string;
  phone: string;
  points: number;
  joinedAt: string;
  tier: "CLASSIC" | "SILVER" | "GOLD";
}

export interface AdminUserRecord extends DemoUser {
  active: boolean;
  lastLogin: string;
}

export interface OfflineOperation {
  id: string;
  label: string;
  createdAt: string;
  sale: SaleRecord;
}

export interface StockMovementRecord {
  id: string;
  branchId: string;
  productId: string;
  productName: string;
  batchNumber?: string;
  type: "SALE" | "RECEIPT" | "ADJUSTMENT" | "RETURN";
  quantity: number;
  balance: number;
  reason: string;
  actor: string;
  createdAt: string;
}

export interface AuditRecord {
  id: string;
  branchId?: string;
  action: string;
  detail: string;
  actor: string;
  createdAt: string;
}

export interface CheckoutInput {
  lines: CartLine[];
  customerType: CustomerType;
  paymentMethod: PaymentMethod;
  cashTendered?: number;
  paymentReference?: string;
  prescriptionConfirmed: boolean;
  loyaltyPhone?: string;
  redeemPoints?: number;
}

export interface PurchaseOrderInput {
  supplierId: string;
  expectedDate: string;
  productId: string;
  quantity: number;
  unitCost: number;
}

export interface GoodsReceiptInput {
  invoiceNumber: string;
  notes?: string;
  lines: Array<{ productId: string; batchNumber: string; expiry: string; quantity: number }>;
}

export interface StockCountInput {
  batchId: string;
  quantity: number;
}

export interface NewUserInput {
  name: string;
  email: string;
  role: UserRole;
  branchName: string;
}
