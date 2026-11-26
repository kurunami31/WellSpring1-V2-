import { useMemo, useRef, useState, type FormEvent } from "react";
import { Minus, Plus, Printer, Receipt as ReceiptIcon, ScanLine, Search, ShieldCheck, ShoppingBag, Trash2, UserPlus, WifiOff, X } from "lucide-react";
import { PaymentMethod } from "@wellspring/shared";
import { useAuth } from "@/context/AuthContext";
import { LOYALTY_EARN_PER_PESO, LOYALTY_MAX_REDEEM_RATE, LOYALTY_POINT_VALUE, usePrototype } from "@/context/PrototypeContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { EmptyState, PageHeader, StatusBadge } from "@/components/shared";
import { calculateSaleTotals, type CustomerType } from "@/lib/sales";
import { daysUntil } from "@/lib/inventory";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { CartLine, LoyaltyMemberRecord, SaleRecord } from "@/types/prototype";

export default function POSPage() {
  const { hasPermission } = useAuth();
  const {
    products, isOnline, completeSale, activeBranch, findLoyaltyMember, enrollLoyaltyMember, canSwitchBranch,
  } = usePrototype();
  const [query, setQuery] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerType, setCustomerType] = useState<CustomerType>("REGULAR");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [cashTendered, setCashTendered] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [prescriptionConfirmed, setPrescriptionConfirmed] = useState(false);
  const [loyaltyPhone, setLoyaltyPhone] = useState("");
  const [member, setMember] = useState<LoyaltyMemberRecord | null>(null);
  const [enrollName, setEnrollName] = useState("");
  const [redeemPoints, setRedeemPoints] = useState("0");
  const [error, setError] = useState("");
  const [lastSale, setLastSale] = useState<SaleRecord | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const canSell = hasPermission("sales:create");

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) => [product.name, product.sku, product.barcode, product.category].some((value) => value.toLowerCase().includes(term)));
  }, [products, query]);

  const detailedCart = useMemo(() => cart.flatMap((line) => {
    const product = products.find((candidate) => candidate.id === line.productId);
    return product ? [{ ...line, product }] : [];
  }), [cart, products]);

  const lineInputs = detailedCart.map(({ product, quantity }) => ({ unitPrice: product.price, quantity, discountPerUnit: 0, taxRate: 0.12 }));
  const baseTotals = detailedCart.length === 0 ? { subtotal: 0, discount: 0, vat: 0, total: 0 } : calculateSaleTotals(lineInputs, customerType);
  const maxRedeemValue = Math.floor(baseTotals.total * LOYALTY_MAX_REDEEM_RATE);
  const maxRedeemPoints = member ? Math.min(member.points, Math.floor(maxRedeemValue / LOYALTY_POINT_VALUE)) : 0;
  const requestedPoints = Math.min(Math.max(0, Number(redeemPoints) || 0), maxRedeemPoints);
  const loyaltyValue = requestedPoints * LOYALTY_POINT_VALUE;
  const totals = detailedCart.length === 0 ? baseTotals : calculateSaleTotals(lineInputs, customerType, { extraDiscount: loyaltyValue });
  const pointsEarned = member ? Math.floor(totals.total / LOYALTY_EARN_PER_PESO) : 0;
  const hasPrescription = detailedCart.some(({ product }) => product.prescription);
  const change = paymentMethod === PaymentMethod.CASH && Number(cashTendered) >= totals.total ? Number(cashTendered) - totals.total : 0;

  const addProduct = (productId: string) => {
    setError("");
    setLastSale(null);
    const product = products.find((candidate) => candidate.id === productId);
    if (!product || product.stock < 1) return;
    const existing = cart.find((line) => line.productId === productId);
    if (existing && existing.quantity >= product.stock) {
      setError(`Only ${product.stock} unexpired ${product.unit}(s) of ${product.name} are available at ${activeBranch.code}.`);
      return;
    }
    setCart((current) => existing
      ? current.map((line) => line.productId === productId ? { ...line, quantity: line.quantity + 1 } : line)
      : [...current, { productId, quantity: 1 }]);
  };

  const handleScan = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const term = scanValue.trim().toLowerCase();
    if (!term) return;
    const match = products.find((product) => product.barcode.toLowerCase() === term || product.sku.toLowerCase() === term);
    if (!match) {
      setError(`No product at this branch matches barcode ${scanValue.trim()}. Check the label or search by name.`);
      setScanValue("");
      return;
    }
    addProduct(match.id);
    setScanValue("");
    scanRef.current?.focus();
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) return;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > product.stock) {
      setError(`Quantity for ${product.name} must be between 1 and ${product.stock}. Expired batches are never sold.`);
      return;
    }
    setError("");
    setCart((current) => current.map((line) => line.productId === productId ? { ...line, quantity } : line));
  };

  const lookupMember = (phone: string) => {
    setLoyaltyPhone(phone);
    const found = findLoyaltyMember(phone);
    setMember(found ?? null);
    if (!found) setRedeemPoints("0");
  };

  const enrollMember = () => {
    try {
      const created = enrollLoyaltyMember(enrollName, loyaltyPhone);
      setMember(created);
      setEnrollName("");
      toast({ variant: "success", title: `${created.name} enrolled`, description: "The member starts at zero points and earns one point per ₱50 spent." });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to enrol this member.");
    }
  };

  const checkout = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const sale = completeSale({
        lines: cart,
        customerType,
        paymentMethod,
        cashTendered: Number(cashTendered),
        paymentReference,
        prescriptionConfirmed,
        loyaltyPhone: member?.phone,
        redeemPoints: requestedPoints,
      });
      setLastSale(sale);
      setCart([]);
      setCashTendered("");
      setPaymentReference("");
      setPrescriptionConfirmed(false);
      setMember(null);
      setLoyaltyPhone("");
      setRedeemPoints("0");
      toast({
        variant: "success",
        title: isOnline ? `Receipt ${sale.receiptNumber} issued` : `${sale.receiptNumber} saved offline`,
        description: isOnline ? `${activeBranch.code} stock and reports updated from the batch ledger.` : "The sale is in the local queue. Synchronize after reconnecting.",
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The sale could not be completed.");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow={`${activeBranch.code} · ${activeBranch.name} · Register 01`}
        title="Point of sale"
        description="Scan a barcode or find an item, confirm the order, then issue a receipt. Each sale draws from the earliest-expiring batch so short-dated stock leaves the shelf first."
        actions={<StatusBadge status={isOnline ? "ONLINE" : "OFFLINE"} />}
      />

      {!canSell && <div className="mb-5 border-l-4 border-[#2563a8] bg-[#e3f0fa] px-4 py-3 text-sm text-[#2563a8]" role="status">This role has read-only sales access. Sign in as a cashier, pharmacist, supervisor, or administrator to complete a sale.</div>}
      {!isOnline && <div className="mb-5 flex items-start gap-3 border-l-4 border-[#855b13] bg-[#fbf1d8] px-4 py-3 text-sm text-[#855b13]" role="status"><WifiOff aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" /><p><strong>Offline checkout is active.</strong> Sales use the stock currently stored on this device and must be synchronized later.</p></div>}

      {lastSale && <Receipt sale={lastSale} onClose={() => setLastSale(null)} />}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <section aria-labelledby="product-search-title">
          <div className="panel mb-4 border-l-4 border-[#087f8c] p-4">
            <label className="field-label" htmlFor="scan-input">Scan barcode</label>
            <div className="relative">
              <ScanLine aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#087f8c]" />
              <input
                ref={scanRef}
                id="scan-input"
                className="text-input pl-10 font-mono tracking-[0.08em]"
                value={scanValue}
                onChange={(event) => setScanValue(event.target.value)}
                onKeyDown={handleScan}
                placeholder="Point the scanner here, or type a barcode / SKU and press Enter"
                autoComplete="off"
                autoFocus
              />
            </div>
            <p className="meta mt-2">The scanner types the barcode and presses Enter. A match drops straight into the current sale.</p>
          </div>

          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div><h2 id="product-search-title" className="section-title">Product finder</h2><p className="meta mt-1">{filteredProducts.length} of {products.length} products at {activeBranch.code}</p></div>
            <div className="relative w-full sm:max-w-sm">
              <label className="sr-only" htmlFor="product-search">Search by product, SKU, or barcode</label>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#6b8299]" />
              <input id="product-search" className="text-input pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, SKU, or barcode" autoComplete="off" />
            </div>
          </div>

          <div className="panel overflow-hidden">
            {filteredProducts.length === 0 ? <EmptyState title="No matching products" description={`Nothing matches “${query}” at this branch. Check the spelling or scan the full barcode.`} action={<Button variant="outline" onClick={() => setQuery("")}>Clear search</Button>} /> : (
              <div className="divide-y divide-[#cbdce5]">
                {filteredProducts.map((product) => {
                  const inCart = cart.find((line) => line.productId === product.id)?.quantity ?? 0;
                  const low = product.stock <= product.reorderPoint;
                  const expiryDays = product.expiry ? daysUntil(product.expiry) : null;
                  return (
                    <div key={product.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{product.name}</h3>{product.prescription && <span className="rounded bg-[#e3f0fa] px-1.5 py-0.5 text-[11px] font-bold text-[#2563a8]">Rx</span>}</div>
                        <p className="mt-1 text-xs text-[#486581]">{product.sku} · {product.category} · {product.batches.length} batch{product.batches.length === 1 ? "" : "es"}</p>
                        <p className={`mt-1 text-xs font-medium ${product.stock === 0 ? "text-[#a12c2c]" : low ? "text-[#855b13]" : "text-[#486581]"}`}>{product.stock} {product.unit}{product.stock === 1 ? "" : "s"} sellable{low && product.stock > 0 ? " · low stock" : ""}{expiryDays !== null && expiryDays <= 90 ? ` · next batch ${expiryDays} days` : ""}</p>
                      </div>
                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <div className="text-right"><p className="font-semibold">{formatCurrency(product.price)}</p><p className="text-xs text-[#486581]">per {product.unit}</p></div>
                        <Button type="button" variant={inCart ? "secondary" : "outline"} onClick={() => addProduct(product.id)} disabled={product.stock === 0 || !canSell} aria-label={`Add ${product.name} to cart`}>
                          <Plus aria-hidden="true" className="mr-1.5 h-4 w-4" />{inCart ? `Add again (${inCart})` : "Add"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <aside className="panel overflow-hidden xl:sticky xl:top-28" aria-labelledby="sale-summary-title">
          <div className="flex items-center justify-between border-b border-dashed border-[#a9bfca] px-5 py-4">
            <div className="flex items-center gap-2"><ReceiptIcon aria-hidden="true" className="h-5 w-5 text-[#087f8c]" /><h2 id="sale-summary-title" className="font-display text-xl font-bold">Current sale</h2></div>
            {cart.length > 0 && <button type="button" className="min-h-11 text-xs font-semibold text-[#a12c2c] underline underline-offset-4" onClick={() => { setCart([]); setError(""); }}>Clear</button>}
          </div>

          {detailedCart.length === 0 ? <EmptyState title="The cart is empty" description="Scan an item or add a product. Batch allocation and payment totals appear here." /> : (
            <div className="divide-y divide-dashed divide-[#cbdce5] px-5">
              {detailedCart.map(({ product, quantity }) => (
                <div key={product.id} className="py-4">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{product.name}</p><p className="mt-0.5 text-xs text-[#486581]">{formatCurrency(product.price)} / {product.unit}</p><p className="mt-0.5 text-[11px] text-[#087f8c]">FEFO · {product.batch} expires {formatDate(product.expiry)}</p></div><button type="button" onClick={() => setCart((current) => current.filter((line) => line.productId !== product.id))} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded text-[#a12c2c] hover:bg-[#fae9e7]" aria-label={`Remove ${product.name}`}><Trash2 aria-hidden="true" className="h-4 w-4" /></button></div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="flex items-center rounded border border-[#cbdce5]">
                      <button type="button" className="inline-flex h-11 w-10 items-center justify-center hover:bg-[#e5f5f1]" onClick={() => updateQuantity(product.id, quantity - 1)} disabled={quantity <= 1} aria-label={`Decrease ${product.name} quantity`}><Minus aria-hidden="true" className="h-4 w-4" /></button>
                      <label className="sr-only" htmlFor={`qty-${product.id}`}>Quantity for {product.name}</label>
                      <input id={`qty-${product.id}`} className="h-11 w-12 border-x border-[#cbdce5] bg-white text-center text-sm font-semibold" type="number" min="1" max={product.stock} step="1" value={quantity} onChange={(event) => updateQuantity(product.id, Number(event.target.value))} />
                      <button type="button" className="inline-flex h-11 w-10 items-center justify-center hover:bg-[#e5f5f1]" onClick={() => updateQuantity(product.id, quantity + 1)} disabled={quantity >= product.stock} aria-label={`Increase ${product.name} quantity`}><Plus aria-hidden="true" className="h-4 w-4" /></button>
                    </div>
                    <p className="text-sm font-semibold">{formatCurrency(product.price * quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={checkout} className="border-t border-dashed border-[#a9bfca] p-5">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="field-label" htmlFor="customer-type">Customer</label><select id="customer-type" className="select-input text-sm" value={customerType} onChange={(event) => { const next = event.target.value as CustomerType; setCustomerType(next); if (next !== "LOYALTY") { setMember(null); setLoyaltyPhone(""); setRedeemPoints("0"); } }}><option value="REGULAR">Regular</option><option value="SENIOR">Senior citizen</option><option value="PWD">PWD</option><option value="LOYALTY">Loyalty member</option></select></div>
              <div><label className="field-label" htmlFor="payment-method">Payment</label><select id="payment-method" className="select-input text-sm" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}><option value="CASH">Cash</option><option value="CARD">Card</option><option value="E_WALLET">E-wallet</option><option value="INSTALLMENT">Installment</option></select></div>
            </div>

            {customerType === "LOYALTY" && <div className="mt-4 rounded border border-[#087f8c] bg-[#eafaf6] p-3">
              <label className="field-label" htmlFor="loyalty-phone">Member mobile number</label>
              <input id="loyalty-phone" className="text-input" inputMode="numeric" value={loyaltyPhone} onChange={(event) => lookupMember(event.target.value)} placeholder="09171234567" />
              {member ? (
                <div className="mt-2 text-xs text-[#087f8c]">
                  <p><strong>{member.name}</strong> · {member.points} points · {member.tier.toLowerCase()} tier</p>
                  <div className="mt-2 flex items-end gap-2">
                    <div className="flex-1"><label className="field-label" htmlFor="redeem-points">Redeem points (max {maxRedeemPoints})</label><input id="redeem-points" className="text-input" type="number" min="0" max={maxRedeemPoints} step="1" value={redeemPoints} onChange={(event) => setRedeemPoints(event.target.value)} /></div>
                    <p className="pb-3 text-xs">= {formatCurrency(requestedPoints * LOYALTY_POINT_VALUE)} off</p>
                  </div>
                  <p className="mt-1 text-[11px] text-[#486581]">Points cover at most 20% of a sale. This receipt earns {pointsEarned} points.</p>
                </div>
              ) : loyaltyPhone.replace(/\D/g, "").length >= 11 ? (
                <div className="mt-3">
                  <p className="text-xs text-[#855b13]">No member found for this number. Enrol them now, or clear the field.</p>
                  <div className="mt-2 flex gap-2">
                    <input aria-label="Member name" className="text-input" value={enrollName} onChange={(event) => setEnrollName(event.target.value)} placeholder="Full name" />
                    <Button type="button" variant="outline" onClick={enrollMember}><UserPlus aria-hidden="true" className="mr-1.5 h-4 w-4" />Enrol</Button>
                  </div>
                </div>
              ) : <p className="mt-2 text-[11px] leading-5 text-[#486581]">Enter the member's 11-digit mobile number to load their points.</p>}
            </div>}

            {(customerType === "SENIOR" || customerType === "PWD") && <p className="mt-3 bg-[#ddf4ee] p-3 text-xs leading-5 text-[#087f8c]">20% statutory discount applied; VAT removed for this sale.</p>}
            {hasPrescription && <label className="mt-4 flex cursor-pointer items-start gap-3 rounded border border-[#2563a8] bg-[#e3f0fa] p-3 text-xs leading-5 text-[#2563a8]"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[#087f8c]" checked={prescriptionConfirmed} onChange={(event) => setPrescriptionConfirmed(event.target.checked)} /><span><strong>Prescription item in cart.</strong> A pharmacist has checked the valid prescription and patient details.</span></label>}

            {paymentMethod === PaymentMethod.CASH ? <div className="mt-4"><div className="flex items-end justify-between gap-2"><label className="field-label" htmlFor="cash-tendered">Cash tendered</label>{totals.total > 0 && <button type="button" className="mb-1 text-xs font-semibold text-[#087f8c] underline" onClick={() => setCashTendered(totals.total.toFixed(2))}>Exact amount</button>}</div><div className="relative"><span className="absolute left-3 top-2.5 text-lg text-[#486581]">₱</span><input id="cash-tendered" className="text-input pl-8" type="number" min={totals.total} step="0.01" inputMode="decimal" placeholder="0.00" value={cashTendered} onChange={(event) => setCashTendered(event.target.value)} /></div>{Number(cashTendered) >= totals.total && totals.total > 0 && <p className="mt-2 text-right text-sm text-[#087f8c]">Change: <strong>{formatCurrency(change)}</strong></p>}</div> : <div className="mt-4"><label className="field-label" htmlFor="payment-reference">{paymentMethod === PaymentMethod.INSTALLMENT ? "Installment agreement number" : "Authorization reference"}</label><input id="payment-reference" className="text-input" value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder={paymentMethod === PaymentMethod.CARD ? "Card approval code" : paymentMethod === PaymentMethod.E_WALLET ? "Wallet transaction ID" : "6-month plan · agreement number"} />{paymentMethod === PaymentMethod.INSTALLMENT && <p className="mt-2 text-[11px] leading-5 text-[#486581]">Record the partner finance agreement. The branch keeps the signed form with the receipt copy for BIR audit.</p>}</div>}

            <dl className="mt-5 space-y-2 border-t border-dashed border-[#a9bfca] pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-[#486581]">Subtotal</dt><dd>{formatCurrency(totals.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-[#486581]">Discount</dt><dd>{totals.discount > 0 ? `−${formatCurrency(totals.discount)}` : formatCurrency(0)}</dd></div>
              {loyaltyValue > 0 && <div className="flex justify-between text-[#087f8c]"><dt>Loyalty ({requestedPoints} pts)</dt><dd>−{formatCurrency(loyaltyValue)}</dd></div>}
              <div className="flex justify-between"><dt className="text-[#486581]">VAT (12%)</dt><dd>{formatCurrency(totals.vat)}</dd></div>
              <div className="flex items-end justify-between border-t border-[#102a43] pt-3"><dt className="font-semibold">Total due</dt><dd className="font-display text-2xl font-bold">{formatCurrency(totals.total)}</dd></div>
            </dl>
            {error && <div role="alert" className="mt-4 border-l-4 border-[#a12c2c] bg-[#fae9e7] px-3 py-2 text-xs leading-5 text-[#a12c2c]">{error}</div>}
            <Button type="submit" size="lg" className="mt-5 w-full" disabled={!canSell || detailedCart.length === 0}><ShoppingBag aria-hidden="true" className="mr-2 h-4 w-4" />{isOnline ? `Charge ${formatCurrency(totals.total)}` : "Save sale offline"}</Button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-[#486581]"><ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />FEFO, expiry, prescription, and payment checks run before receipt issue.</p>
          </form>
        </aside>
      </div>
      {!canSwitchBranch && <p className="mt-4 text-xs text-[#486581]">Assigned to {activeBranch.code} · {activeBranch.name}. Head-office accounts can switch branches from the header.</p>}
    </div>
  );
}

function Receipt({ sale, onClose }: { sale: SaleRecord; onClose: () => void }) {
  return (
    <section className="receipt-print relative mx-auto mb-6 max-w-lg border border-[#102a43] bg-white p-6 shadow-[0_12px_32px_rgb(16_42_67/0.10)]" aria-labelledby="receipt-title" aria-live="polite">
      <button type="button" onClick={onClose} className="absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded hover:bg-[#e5f5f1] print:hidden" aria-label="Close receipt"><X aria-hidden="true" className="h-5 w-5" /></button>
      <header className="receipt-header">
        <p className="eyebrow">WellSpring One · {sale.branchCode}</p>
        <h2 id="receipt-title">Official receipt</h2>
        <p className="receipt-branch">{sale.branchCode} Branch</p>
        <p className="receipt-number">{sale.receiptNumber}</p>
        <p className="receipt-meta">{formatDateTime(sale.createdAt)}<br />Cashier: {sale.cashier}</p>
      </header>
      <div className="receipt-items">{sale.items.map((item) => (
        <div key={item.productId} className="receipt-item">
          <div>
            <p className="receipt-item-name">{item.productName}</p>
            <p className="receipt-item-meta">{item.sku} · {item.quantity} × {formatCurrency(item.unitPrice)}</p>
            <p className="receipt-item-meta">Batch {item.batchAllocations.map((allocation) => `${allocation.batchNumber} (${allocation.quantity})`).join(", ") || "n/a"}</p>
          </div>
          <p className="receipt-item-total">{formatCurrency(item.lineTotal)}</p>
        </div>
      ))}</div>
      <dl className="receipt-totals">
        <div><dt>Subtotal</dt><dd>{formatCurrency(sale.subtotal)}</dd></div>
        <div><dt>Discount</dt><dd>{sale.discount > 0 ? `−${formatCurrency(sale.discount)}` : formatCurrency(0)}</dd></div>
        {sale.loyaltyDiscount > 0 && <div><dt>Loyalty ({sale.loyaltyPointsRedeemed} pts)</dt><dd>−{formatCurrency(sale.loyaltyDiscount)}</dd></div>}
        <div><dt>VAT</dt><dd>{formatCurrency(sale.vat)}</dd></div>
        <div className="receipt-grand-total"><dt>Total paid</dt><dd>{formatCurrency(sale.total)}</dd></div>
        {sale.paymentMethod === PaymentMethod.CASH && sale.cashTendered !== undefined && <div><dt>Cash tendered</dt><dd>{formatCurrency(sale.cashTendered)}</dd></div>}
        {sale.paymentMethod === PaymentMethod.CASH && sale.change !== undefined && <div><dt>Change</dt><dd>{formatCurrency(sale.change)}</dd></div>}
        {sale.paymentReference && <div><dt>Payment reference</dt><dd className="receipt-reference">{sale.paymentReference}</dd></div>}
        {sale.loyaltyPhone && <div><dt>Loyalty</dt><dd>{sale.loyaltyPointsEarned} pts earned · {sale.loyaltyPointsRedeemed} redeemed</dd></div>}
      </dl>
      <div className="receipt-payment"><span>{sale.customerType} · {sale.paymentMethod.replace("_", "-")}</span><StatusBadge status={sale.offline ? "PENDING SYNC" : "SYNCED"} /></div>
      <footer className="receipt-footer"><p>Thank you for your purchase.</p><p>Keep this receipt for your records.</p></footer>
      <Button type="button" variant="outline" className="mt-5 w-full print:hidden" onClick={() => window.print()}><Printer aria-hidden="true" className="mr-2 h-4 w-4" />Print receipt</Button>
    </section>
  );
}
