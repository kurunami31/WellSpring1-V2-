import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { BUSINESS_RULES, PaymentMethod, UserRole } from "@wellspring/shared";
import { useAuth } from "@/context/AuthContext";
import { BRANCH_BY_ID, BRANCHES } from "@/data/branches";
import {
  INITIAL_ADMIN_USERS,
  INITIAL_AUDIT_LOG,
  INITIAL_INVENTORIES,
  INITIAL_LOYALTY_MEMBERS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_SALES,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_SUPPLIERS,
  MAIN_BRANCH_ID,
} from "@/data/demo";
import { allocateFefo, daysUntil, deductBatches, restoreBatches, syncProduct } from "@/lib/inventory";
import { calculateChange, calculateSaleTotals } from "@/lib/sales";
import type {
  AdminUserRecord,
  AuditRecord,
  BatchRecord,
  BranchRecord,
  CheckoutInput,
  GoodsReceiptInput,
  LoyaltyMemberRecord,
  NewUserInput,
  OfflineOperation,
  ProductRecord,
  PurchaseOrderInput,
  PurchaseOrderRecord,
  SaleRecord,
  SaleStatus,
  StockCountInput,
  StockMovementRecord,
  SupplierRecord,
} from "@/types/prototype";

export const LOYALTY_POINT_VALUE = 1;
export const LOYALTY_EARN_PER_PESO = 50;
export const LOYALTY_MAX_REDEEM_RATE = 0.2;

interface PrototypeState {
  branchInventories: Record<string, ProductRecord[]>;
  sales: SaleRecord[];
  purchaseOrders: PurchaseOrderRecord[];
  suppliers: SupplierRecord[];
  loyaltyMembers: LoyaltyMemberRecord[];
  adminUsers: AdminUserRecord[];
  offlineQueue: OfflineOperation[];
  stockMovements: StockMovementRecord[];
  auditLog: AuditRecord[];
}

interface PrototypeContextValue extends PrototypeState {
  isOnline: boolean;
  lastSyncedAt: string;
  branches: BranchRecord[];
  activeBranch: BranchRecord;
  activeBranchId: string;
  canSwitchBranch: boolean;
  products: ProductRecord[];
  /** Inventory and sales for the active branch only; the registers below stay complete. */
  allSales: SaleRecord[];
  allPurchaseOrders: PurchaseOrderRecord[];
  switchBranch: (branchId: string) => void;
  setOnline: (online: boolean) => void;
  completeSale: (input: CheckoutInput) => SaleRecord;
  adjustStock: (productId: string, counts: StockCountInput[], reason: string) => void;
  voidSale: (saleId: string, reason: string) => void;
  refundSale: (saleId: string, reason: string) => void;
  createPurchaseOrder: (input: PurchaseOrderInput) => PurchaseOrderRecord;
  sendPurchaseOrder: (id: string) => void;
  receivePurchaseOrder: (id: string, grn: GoodsReceiptInput) => void;
  toggleSupplierAccreditation: (supplierId: string) => void;
  findLoyaltyMember: (phone: string) => LoyaltyMemberRecord | undefined;
  enrollLoyaltyMember: (name: string, phone: string) => LoyaltyMemberRecord;
  addUser: (input: NewUserInput) => void;
  toggleUser: (id: string) => void;
  syncQueue: () => number;
  resetDemo: () => void;
}

const STORAGE_KEY = "wellspring-prototype-v2";
const PrototypeContext = createContext<PrototypeContextValue | undefined>(undefined);

function cloneInventory(inventories: Record<string, ProductRecord[]>): Record<string, ProductRecord[]> {
  return Object.fromEntries(Object.entries(inventories).map(([branchId, products]) => [
    branchId,
    products.map((product) => ({ ...product, batches: product.batches.map((batch) => ({ ...batch })) })),
  ]));
}

function initialState(): PrototypeState {
  return {
    branchInventories: cloneInventory(INITIAL_INVENTORIES),
    sales: INITIAL_SALES.map((sale) => ({
      ...sale,
      items: sale.items.map((item) => ({ ...item, batchAllocations: item.batchAllocations.map((allocation) => ({ ...allocation })) })),
    })),
    purchaseOrders: INITIAL_PURCHASE_ORDERS.map((order) => ({
      ...order,
      items: order.items.map((item) => ({ ...item })),
      grn: order.grn ? { ...order.grn, lines: order.grn.lines.map((line) => ({ ...line })) } : undefined,
    })),
    suppliers: INITIAL_SUPPLIERS.map((supplier) => ({ ...supplier })),
    loyaltyMembers: INITIAL_LOYALTY_MEMBERS.map((member) => ({ ...member })),
    adminUsers: INITIAL_ADMIN_USERS.map((user) => ({ ...user })),
    offlineQueue: [],
    stockMovements: INITIAL_STOCK_MOVEMENTS.map((movement) => ({ ...movement })),
    auditLog: INITIAL_AUDIT_LOG.map((entry) => ({ ...entry })),
  };
}

function loadState(): PrototypeState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialState();
    const parsed = JSON.parse(stored) as Partial<PrototypeState>;
    if (!parsed.branchInventories || !Array.isArray(parsed.sales) || !Array.isArray(parsed.purchaseOrders)) {
      return initialState();
    }
    return { ...initialState(), ...parsed };
  } catch {
    return initialState();
  }
}

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function tierFor(points: number): LoyaltyMemberRecord["tier"] {
  if (points >= 300) return "GOLD";
  if (points >= 100) return "SILVER";
  return "CLASSIC";
}

function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function normalisePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

export function PrototypeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<PrototypeState>(loadState);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState(() => new Date().toISOString());
  const [activeBranchId, setActiveBranchId] = useState(() => user?.branchId ?? MAIN_BRANCH_ID);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const actor = user?.name ?? "Demo user";
  const canSwitchBranch = !user?.branchId;
  const activeBranch = BRANCH_BY_ID.get(activeBranchId) ?? BRANCHES[0];
  const products = useMemo(
    () => state.branchInventories[activeBranchId] ?? [],
    [state.branchInventories, activeBranchId],
  );
  const scopedSales = useMemo(
    () => state.sales.filter((sale) => sale.branchId === activeBranchId),
    [state.sales, activeBranchId],
  );
  const scopedPurchaseOrders = useMemo(
    () => state.purchaseOrders.filter((order) => order.branchId === activeBranchId),
    [state.purchaseOrders, activeBranchId],
  );

  const setOnline = useCallback((online: boolean) => setIsOnline(online), []);

  const switchBranch = useCallback((branchId: string) => {
    if (!BRANCH_BY_ID.has(branchId)) throw new Error("That branch is not part of this company.");
    if (user?.branchId && user.branchId !== branchId) {
      throw new Error(`Your account is assigned to ${BRANCH_BY_ID.get(user.branchId)?.name ?? "one branch"}. Head-office accounts can switch branches.`);
    }
    setActiveBranchId(branchId);
  }, [user?.branchId]);

  const findLoyaltyMember = useCallback((phone: string): LoyaltyMemberRecord | undefined => {
    const normalised = normalisePhone(phone);
    if (normalised.length < 10) return undefined;
    return state.loyaltyMembers.find((member) => normalisePhone(member.phone) === normalised);
  }, [state.loyaltyMembers]);

  const enrollLoyaltyMember = useCallback((name: string, phone: string): LoyaltyMemberRecord => {
    const normalised = normalisePhone(phone);
    if (!name.trim()) throw new Error("Enter the member's name to enrol them.");
    if (normalised.length !== 11) throw new Error("Enter an 11-digit mobile number, for example 09171234567.");
    if (state.loyaltyMembers.some((member) => normalisePhone(member.phone) === normalised)) {
      throw new Error("That mobile number is already enrolled.");
    }
    const member: LoyaltyMemberRecord = {
      id: id("lm"),
      name: name.trim(),
      phone: normalised,
      points: 0,
      joinedAt: todayKey(),
      tier: "CLASSIC",
    };
    const createdAt = new Date().toISOString();
    setState((current) => ({
      ...current,
      loyaltyMembers: [...current.loyaltyMembers, member],
      auditLog: [{
        id: id("audit"), branchId: activeBranchId, action: "Loyalty member enrolled",
        detail: `${member.name} · ${member.phone}`, actor, createdAt,
      }, ...current.auditLog],
    }));
    return member;
  }, [activeBranchId, actor, state.loyaltyMembers]);

  const completeSale = useCallback((input: CheckoutInput): SaleRecord => {
    if (!user) throw new Error("Sign in before completing a sale.");
    if (input.lines.length === 0) throw new Error("Add at least one item before checkout.");

    const lines = input.lines.map((line) => {
      const product = products.find((candidate) => candidate.id === line.productId);
      if (!product) throw new Error("A product in the cart is no longer available at this branch.");
      if (!Number.isInteger(line.quantity) || line.quantity < 1) {
        throw new Error(`Enter a whole-number quantity for ${product.name}.`);
      }
      const { allocations, remaining } = allocateFefo(product.batches, line.quantity);
      if (remaining > 0) {
        throw new Error(`Only ${line.quantity - remaining} unexpired ${product.unit}(s) of ${product.name} are available.`);
      }
      return { product, quantity: line.quantity, allocations };
    });

    if (lines.some(({ product }) => product.prescription) && !input.prescriptionConfirmed) {
      throw new Error("Confirm that the pharmacist checked the prescription before payment.");
    }
    if (
      (input.paymentMethod === PaymentMethod.CARD || input.paymentMethod === PaymentMethod.E_WALLET || input.paymentMethod === PaymentMethod.INSTALLMENT)
      && !input.paymentReference?.trim()
    ) {
      throw new Error("Enter the authorization or installment agreement reference.");
    }

    const member = input.customerType === "LOYALTY" ? findLoyaltyMember(input.loyaltyPhone ?? "") : undefined;
    if (input.customerType === "LOYALTY" && !member) {
      throw new Error("Find or enrol the loyalty member before completing a loyalty sale.");
    }

    const lineInputs = lines.map(({ product, quantity }) => ({
      unitPrice: product.price,
      quantity,
      discountPerUnit: 0,
      taxRate: BUSINESS_RULES.VAT_RATE,
    }));
    const provisional = calculateSaleTotals(lineInputs, input.customerType);
    const redeemPoints = input.redeemPoints ?? 0;
    if (!Number.isInteger(redeemPoints) || redeemPoints < 0) {
      throw new Error("Redeemed points must be a whole number.");
    }
    if (redeemPoints > 0 && !member) throw new Error("Only loyalty members can redeem points.");
    const redeemValue = redeemPoints * LOYALTY_POINT_VALUE;
    const maxRedeemValue = Math.floor(provisional.total * LOYALTY_MAX_REDEEM_RATE);
    if (redeemValue > maxRedeemValue) {
      throw new Error(`Points may cover at most 20% of this sale (₱${maxRedeemValue.toFixed(2)}).`);
    }
    if (member && redeemValue > member.points * LOYALTY_POINT_VALUE) {
      throw new Error(`The member only has ${member.points} points available.`);
    }

    const totals = calculateSaleTotals(lineInputs, input.customerType, { extraDiscount: redeemValue });
    const change = input.paymentMethod === PaymentMethod.CASH
      ? calculateChange(input.cashTendered ?? 0, totals.total)
      : 0;

    const sequence = Math.max(
      1000,
      ...state.sales.map((sale) => Number(sale.receiptNumber.split("-").at(-1)) || 0),
    ) + 1;
    const createdAt = new Date().toISOString();
    const pointsEarned = member ? Math.floor(totals.total / LOYALTY_EARN_PER_PESO) : 0;
    const sale: SaleRecord = {
      id: id("sale"),
      receiptNumber: `WS-${new Date().getFullYear()}-${String(sequence).padStart(5, "0")}`,
      createdAt,
      branchId: activeBranchId,
      branchCode: activeBranch.code,
      cashier: actor,
      customerType: input.customerType,
      paymentMethod: input.paymentMethod,
      items: lines.map(({ product, quantity, allocations }) => {
        const subtotal = product.price * quantity;
        const exempt = input.customerType === "SENIOR" || input.customerType === "PWD";
        return {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity,
          unitPrice: product.price,
          lineTotal: Math.round((exempt ? subtotal * 0.8 : subtotal * 1.12) * 100) / 100,
          batchAllocations: allocations,
          prescription: product.prescription,
        };
      }),
      subtotal: totals.subtotal,
      discount: totals.discount,
      vat: totals.vat,
      total: totals.total,
      cashTendered: input.paymentMethod === PaymentMethod.CASH ? input.cashTendered : undefined,
      change: input.paymentMethod === PaymentMethod.CASH ? change : undefined,
      paymentReference: input.paymentReference?.trim() || undefined,
      loyaltyPhone: member?.phone,
      loyaltyPointsEarned: pointsEarned,
      loyaltyPointsRedeemed: redeemPoints,
      loyaltyDiscount: redeemValue,
      status: "COMPLETED",
      offline: !isOnline,
    };

    setState((current) => {
      const movements: StockMovementRecord[] = [];
      const branchProducts = (current.branchInventories[activeBranchId] ?? []).map((product) => {
        const line = lines.find((candidate) => candidate.product.id === product.id);
        if (!line) return product;
        const next = syncProduct({ ...product, batches: deductBatches(product.batches, line.allocations) });
        line.allocations.forEach((allocation) => {
          const batch = next.batches.find((candidate) => candidate.batchNumber === allocation.batchNumber);
          movements.push({
            id: id("movement"),
            branchId: activeBranchId,
            productId: product.id,
            productName: product.name,
            batchNumber: allocation.batchNumber,
            type: "SALE",
            quantity: -allocation.quantity,
            balance: batch?.quantity ?? 0,
            reason: sale.receiptNumber,
            actor,
            createdAt,
          });
        });
        return next;
      });

      return {
        ...current,
        branchInventories: { ...current.branchInventories, [activeBranchId]: branchProducts },
        sales: [sale, ...current.sales],
        loyaltyMembers: member ? current.loyaltyMembers.map((candidate) => {
          if (candidate.id !== member.id) return candidate;
          const points = candidate.points - redeemPoints + pointsEarned;
          return { ...candidate, points, tier: tierFor(points) };
        }) : current.loyaltyMembers,
        offlineQueue: isOnline ? current.offlineQueue : [
          {
            id: id("sync"),
            label: `${sale.receiptNumber} · ${sale.items.length} line item${sale.items.length === 1 ? "" : "s"}`,
            createdAt,
            sale,
          },
          ...current.offlineQueue,
        ],
        stockMovements: [...movements, ...current.stockMovements],
        auditLog: [{
          id: id("audit"),
          branchId: activeBranchId,
          action: isOnline ? "Sale completed" : "Offline sale queued",
          detail: `${sale.receiptNumber} · ₱${sale.total.toFixed(2)}${redeemPoints > 0 ? ` · ${redeemPoints} points redeemed` : ""}`,
          actor,
          createdAt,
        }, ...current.auditLog],
      };
    });
    return sale;
  }, [activeBranch.code, activeBranchId, actor, findLoyaltyMember, isOnline, products, state.sales, user]);

  const adjustStock = useCallback((productId: string, counts: StockCountInput[], reason: string) => {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) throw new Error("Select a product to adjust.");
    if (!reason.trim()) throw new Error("Select or enter a reason for the adjustment.");
    if (counts.length === 0) throw new Error("Enter at least one counted batch quantity.");

    const normalised = counts.map((count) => {
      const batch = product.batches.find((candidate) => candidate.id === count.batchId);
      if (!batch) throw new Error("One of the selected batches no longer exists.");
      if (!Number.isInteger(count.quantity) || count.quantity < 0) {
        throw new Error("Counted batches must be whole numbers of zero or more.");
      }
      return { batch, quantity: count.quantity };
    });

    const createdAt = new Date().toISOString();
    setState((current) => {
      const movements: StockMovementRecord[] = [];
      const branchProducts = (current.branchInventories[activeBranchId] ?? []).map((item) => {
        if (item.id !== productId) return item;
        const batches = item.batches.map((batch) => {
          const counted = normalised.find((entry) => entry.batch.id === batch.id);
          if (!counted) return batch;
          const variance = counted.quantity - batch.quantity;
          if (variance !== 0) {
            movements.push({
              id: id("movement"),
              branchId: activeBranchId,
              productId: product.id,
              productName: product.name,
              batchNumber: batch.batchNumber,
              type: "ADJUSTMENT",
              quantity: variance,
              balance: counted.quantity,
              reason,
              actor,
              createdAt,
            });
          }
          return { ...batch, quantity: counted.quantity };
        });
        return syncProduct({ ...item, batches });
      });
      const varianceTotal = normalised.reduce((sum, entry) => sum + (entry.quantity - entry.batch.quantity), 0);
      return {
        ...current,
        branchInventories: { ...current.branchInventories, [activeBranchId]: branchProducts },
        stockMovements: [...movements, ...current.stockMovements],
        auditLog: [{
          id: id("audit"),
          branchId: activeBranchId,
          action: "Stock count recorded",
          detail: `${product.sku} · ${varianceTotal >= 0 ? "+" : ""}${varianceTotal} · ${reason}`,
          actor,
          createdAt,
        }, ...current.auditLog],
      };
    });
  }, [activeBranchId, actor, products]);

  const reverseSale = useCallback((saleId: string, status: Exclude<SaleStatus, "COMPLETED">, reason: string) => {
    const sale = state.sales.find((candidate) => candidate.id === saleId);
    if (!sale) throw new Error("That receipt could not be found.");
    if (sale.status !== "COMPLETED") throw new Error(`This receipt is already ${sale.status.toLowerCase()}.`);
    if (!reason.trim()) throw new Error("Record a reason for the audit trail.");

    const createdAt = new Date().toISOString();
    setState((current) => {
      const branchProducts = (current.branchInventories[sale.branchId] ?? []).map((product) => {
        const line = sale.items.find((item) => item.productId === product.id);
        if (!line) return product;
        return syncProduct({ ...product, batches: restoreBatches(product.batches, line.batchAllocations, createdAt) });
      });

      const movements: StockMovementRecord[] = sale.items.flatMap((line) => line.batchAllocations.map((allocation) => ({
        id: id("movement"),
        branchId: sale.branchId,
        productId: line.productId,
        productName: line.productName,
        batchNumber: allocation.batchNumber,
        type: "RETURN" as const,
        quantity: allocation.quantity,
        balance: 0,
        reason: `${sale.receiptNumber} · ${status === "VOIDED" ? "void" : "refund"}`,
        actor,
        createdAt,
      })));

      const member = sale.loyaltyPhone
        ? current.loyaltyMembers.find((candidate) => normalisePhone(candidate.phone) === normalisePhone(sale.loyaltyPhone ?? ""))
        : undefined;

      return {
        ...current,
        branchInventories: { ...current.branchInventories, [sale.branchId]: branchProducts },
        sales: current.sales.map((candidate) => candidate.id === saleId
          ? status === "VOIDED"
            ? {
              ...candidate,
              status: "VOIDED",
              voidedAt: createdAt,
              voidedBy: actor,
              voidReason: reason.trim(),
              offline: false,
            }
            : {
              ...candidate,
              status: "REFUNDED",
              refundedAt: createdAt,
              refundedBy: actor,
              refundReason: reason.trim(),
              refundAmount: candidate.total,
              offline: false,
            }
          : candidate),
        loyaltyMembers: member ? current.loyaltyMembers.map((candidate) => {
          if (candidate.id !== member.id) return candidate;
          const points = Math.max(0, candidate.points - sale.loyaltyPointsEarned + sale.loyaltyPointsRedeemed);
          return { ...candidate, points, tier: tierFor(points) };
        }) : current.loyaltyMembers,
        stockMovements: [...movements, ...current.stockMovements],
        auditLog: [{
          id: id("audit"),
          branchId: sale.branchId,
          action: status === "VOIDED" ? "Sale voided" : "Refund processed",
          detail: `${sale.receiptNumber} · ₱${sale.total.toFixed(2)} · ${reason.trim()}`,
          actor,
          createdAt,
        }, ...current.auditLog],
      };
    });
  }, [actor, state.sales]);

  const voidSale = useCallback((saleId: string, reason: string) => {
    const sale = state.sales.find((candidate) => candidate.id === saleId);
    if (!sale) throw new Error("That receipt could not be found.");
    if (todayKey(new Date(sale.createdAt)) !== todayKey()) {
      throw new Error("Only receipts from today can be voided. Use a refund for earlier transactions.");
    }
    reverseSale(saleId, "VOIDED", reason);
  }, [reverseSale, state.sales]);

  const refundSale = useCallback((saleId: string, reason: string) => {
    reverseSale(saleId, "REFUNDED", reason);
  }, [reverseSale]);

  const createPurchaseOrder = useCallback((input: PurchaseOrderInput): PurchaseOrderRecord => {
    const product = products.find((candidate) => candidate.id === input.productId);
    const supplier = state.suppliers.find((candidate) => candidate.id === input.supplierId);
    if (!product) throw new Error("Select a product for the purchase order.");
    if (!supplier) throw new Error("Choose an accredited supplier.");
    if (!supplier.accredited) throw new Error(`${supplier.name} is not accredited. Restore accreditation before ordering.`);
    if (!input.expectedDate) throw new Error("Choose an expected delivery date.");
    if (!Number.isInteger(input.quantity) || input.quantity < 1) throw new Error("Order quantity must be at least one.");
    if (!Number.isFinite(input.unitCost) || input.unitCost <= 0) throw new Error("Unit cost must be greater than zero.");
    const sequence = Math.max(42, ...state.purchaseOrders.map((order) => Number(order.poNumber.split("-").at(-1)) || 0)) + 1;
    const order: PurchaseOrderRecord = {
      id: id("po"),
      poNumber: `PO-${new Date().getFullYear()}-${String(sequence).padStart(4, "0")}`,
      supplierId: supplier.id,
      supplier: supplier.name,
      branchId: activeBranchId,
      createdAt: new Date().toISOString(),
      expectedDate: input.expectedDate,
      status: "DRAFT",
      total: Math.round(input.quantity * input.unitCost * 100) / 100,
      items: [{ productId: product.id, productName: product.name, quantity: input.quantity, unitCost: input.unitCost }],
    };
    setState((current) => ({
      ...current,
      purchaseOrders: [order, ...current.purchaseOrders],
      auditLog: [{
        id: id("audit"), branchId: activeBranchId, action: "Purchase order drafted",
        detail: `${order.poNumber} · ${order.supplier}`, actor, createdAt: order.createdAt,
      }, ...current.auditLog],
    }));
    return order;
  }, [activeBranchId, actor, products, state.purchaseOrders, state.suppliers]);

  const sendPurchaseOrder = useCallback((orderId: string) => {
    const order = state.purchaseOrders.find((candidate) => candidate.id === orderId);
    if (!order || order.status !== "DRAFT") throw new Error("Only draft orders can be sent for fulfillment.");
    const supplier = state.suppliers.find((candidate) => candidate.id === order.supplierId);
    if (supplier && !supplier.accredited) throw new Error(`${supplier.name} is not accredited. Restore accreditation before sending.`);
    setState((current) => ({
      ...current,
      purchaseOrders: current.purchaseOrders.map((item) => item.id === orderId ? { ...item, status: "SENT" } : item),
      auditLog: [{
        id: id("audit"), branchId: order.branchId, action: "Purchase order approved",
        detail: `${order.poNumber} · ${order.supplier}`, actor, createdAt: new Date().toISOString(),
      }, ...current.auditLog],
    }));
  }, [actor, state.purchaseOrders, state.suppliers]);

  const receivePurchaseOrder = useCallback((orderId: string, grn: GoodsReceiptInput) => {
    const order = state.purchaseOrders.find((candidate) => candidate.id === orderId);
    if (!order || order.status !== "SENT") throw new Error("Only sent orders can be received.");
    if (order.branchId !== activeBranchId) throw new Error("Switch to the order's branch before receiving it.");
    if (!grn.invoiceNumber.trim()) throw new Error("Enter the supplier invoice number.");
    if (grn.lines.length !== order.items.length) throw new Error("Record a batch for every ordered line.");

    const checked = grn.lines.map((line) => {
      const item = order.items.find((candidate) => candidate.productId === line.productId);
      if (!item) throw new Error("A received line does not belong to this purchase order.");
      if (!Number.isInteger(line.quantity) || line.quantity < 1) throw new Error("Received quantities must be whole numbers greater than zero.");
      if (line.quantity > item.quantity) throw new Error(`Only ${item.quantity} ${item.productName} were ordered.`);
      if (!line.batchNumber.trim()) throw new Error("Record the batch number printed on the carton.");
      if (daysUntil(line.expiry) < 0) throw new Error("An expiry date is in the past. Reject that batch at receiving.");
      return { ...line, item };
    });

    const createdAt = new Date().toISOString();
    const sequence = Math.max(
      0,
      ...state.purchaseOrders.map((candidate) => Number(candidate.grn?.grnNumber.split("-").at(-1)) || 0),
    ) + 1;
    const grnNumber = `GRN-${new Date().getFullYear()}-${String(sequence).padStart(4, "0")}`;

    setState((current) => {
      const movements: StockMovementRecord[] = [];
      const branchProducts = (current.branchInventories[order.branchId] ?? []).map((product) => {
        const line = checked.find((candidate) => candidate.item.productId === product.id);
        if (!line) return product;
        const batches: BatchRecord[] = product.batches.map((batch) => ({ ...batch }));
        const existing = batches.find((batch) => batch.batchNumber === line.batchNumber.trim() && batch.expiry === line.expiry);
        if (existing) existing.quantity += line.quantity;
        else batches.push({
          id: id("batch"),
          batchNumber: line.batchNumber.trim(),
          expiry: line.expiry,
          quantity: line.quantity,
          receivedAt: createdAt,
        });
        const next = syncProduct({ ...product, batches });
        movements.push({
          id: id("movement"),
          branchId: order.branchId,
          productId: product.id,
          productName: product.name,
          batchNumber: line.batchNumber.trim(),
          type: "RECEIPT",
          quantity: line.quantity,
          balance: next.stock,
          reason: grnNumber,
          actor,
          createdAt,
        });
        return next;
      });

      return {
        ...current,
        branchInventories: { ...current.branchInventories, [order.branchId]: branchProducts },
        purchaseOrders: current.purchaseOrders.map((item) => item.id === orderId ? {
          ...item,
          status: "RECEIVED",
          grn: {
            grnNumber,
            invoiceNumber: grn.invoiceNumber.trim(),
            receivedAt: createdAt,
            receivedBy: actor,
            notes: grn.notes?.trim() || undefined,
            lines: checked.map((line) => ({
              productId: line.productId,
              batchNumber: line.batchNumber.trim(),
              expiry: line.expiry,
              quantity: line.quantity,
            })),
          },
        } : item),
        stockMovements: [...movements, ...current.stockMovements],
        auditLog: [{
          id: id("audit"), branchId: order.branchId, action: "Goods received",
          detail: `${grnNumber} · ${order.poNumber} · invoice ${grn.invoiceNumber.trim()}`,
          actor, createdAt,
        }, ...current.auditLog],
      };
    });
  }, [activeBranchId, actor, state.purchaseOrders]);

  const toggleSupplierAccreditation = useCallback((supplierId: string) => {
    const supplier = state.suppliers.find((candidate) => candidate.id === supplierId);
    if (!supplier) throw new Error("That supplier is not in the directory.");
    const createdAt = new Date().toISOString();
    setState((current) => ({
      ...current,
      suppliers: current.suppliers.map((candidate) => candidate.id === supplierId
        ? { ...candidate, accredited: !candidate.accredited }
        : candidate),
      auditLog: [{
        id: id("audit"),
        branchId: activeBranchId,
        action: supplier.accredited ? "Supplier accreditation suspended" : "Supplier accreditation restored",
        detail: `${supplier.code} · ${supplier.name}`,
        actor,
        createdAt,
      }, ...current.auditLog],
    }));
  }, [activeBranchId, actor, state.suppliers]);

  const addUser = useCallback((input: NewUserInput) => {
    if (!input.name.trim() || !/^\S+@\S+\.\S+$/.test(input.email)) throw new Error("Enter a name and a valid email address.");
    if (state.adminUsers.some((candidate) => candidate.email.toLowerCase() === input.email.toLowerCase())) {
      throw new Error("A user with that email already exists.");
    }
    const createdAt = new Date().toISOString();
    const newUser: AdminUserRecord = {
      id: id("user"), name: input.name.trim(), email: input.email.trim(), role: input.role,
      branchId: input.role === UserRole.SYSTEM_ADMIN || input.role === UserRole.HEAD_OFFICE_MANAGER ? null : activeBranchId,
      branchName: input.role === UserRole.SYSTEM_ADMIN || input.role === UserRole.HEAD_OFFICE_MANAGER ? "All branches" : activeBranch.name,
      active: true, lastLogin: createdAt,
    };
    setState((current) => ({
      ...current,
      adminUsers: [...current.adminUsers, newUser],
      auditLog: [{
        id: id("audit"), branchId: activeBranchId, action: "User account created",
        detail: `${newUser.email} · ${newUser.role}`, actor, createdAt,
      }, ...current.auditLog],
    }));
  }, [activeBranch.name, activeBranchId, actor, state.adminUsers]);

  const toggleUser = useCallback((userId: string) => {
    if (userId === user?.id) throw new Error("You cannot deactivate your own account.");
    const account = state.adminUsers.find((candidate) => candidate.id === userId);
    if (!account) return;
    setState((current) => ({
      ...current,
      adminUsers: current.adminUsers.map((item) => item.id === userId ? { ...item, active: !item.active } : item),
      auditLog: [{
        id: id("audit"), branchId: account.branchId ?? undefined,
        action: account.active ? "User account deactivated" : "User account activated",
        detail: account.email, actor, createdAt: new Date().toISOString(),
      }, ...current.auditLog],
    }));
  }, [actor, state.adminUsers, user?.id]);

  const syncQueue = useCallback((): number => {
    if (!isOnline) throw new Error("Reconnect before synchronizing the offline queue.");
    const count = state.offlineQueue.length;
    if (count === 0) return 0;
    const syncedIds = new Set(state.offlineQueue.map((operation) => operation.sale.id));
    const createdAt = new Date().toISOString();
    setState((current) => ({
      ...current,
      sales: current.sales.map((sale) => syncedIds.has(sale.id) ? { ...sale, offline: false } : sale),
      offlineQueue: [],
      auditLog: [{
        id: id("audit"), branchId: activeBranchId, action: "Offline queue synchronized",
        detail: `${count} sale${count === 1 ? "" : "s"} uploaded without duplicates`, actor, createdAt,
      }, ...current.auditLog],
    }));
    setLastSyncedAt(createdAt);
    return count;
  }, [activeBranchId, actor, isOnline, state.offlineQueue]);

  const resetDemo = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(initialState());
    setIsOnline(true);
    setActiveBranchId(user?.branchId ?? MAIN_BRANCH_ID);
    setLastSyncedAt(new Date().toISOString());
  }, [user?.branchId]);

  const value = useMemo(() => ({
    ...state,
    products,
    sales: scopedSales,
    allSales: state.sales,
    purchaseOrders: scopedPurchaseOrders,
    allPurchaseOrders: state.purchaseOrders,
    isOnline,
    lastSyncedAt,
    branches: BRANCHES,
    activeBranch,
    activeBranchId,
    canSwitchBranch,
    switchBranch,
    setOnline,
    completeSale,
    adjustStock,
    voidSale,
    refundSale,
    createPurchaseOrder,
    sendPurchaseOrder,
    receivePurchaseOrder,
    toggleSupplierAccreditation,
    findLoyaltyMember,
    enrollLoyaltyMember,
    addUser,
    toggleUser,
    syncQueue,
    resetDemo,
  }), [
    state, products, scopedSales, scopedPurchaseOrders, isOnline, lastSyncedAt, activeBranch,
    activeBranchId, canSwitchBranch, switchBranch, setOnline, completeSale, adjustStock, voidSale,
    refundSale, createPurchaseOrder, sendPurchaseOrder, receivePurchaseOrder, toggleSupplierAccreditation,
    findLoyaltyMember, enrollLoyaltyMember, addUser, toggleUser, syncQueue, resetDemo,
  ]);

  return <PrototypeContext.Provider value={value}>{children}</PrototypeContext.Provider>;
}

export function usePrototype() {
  const context = useContext(PrototypeContext);
  if (!context) throw new Error("usePrototype must be used within PrototypeProvider");
  return context;
}
