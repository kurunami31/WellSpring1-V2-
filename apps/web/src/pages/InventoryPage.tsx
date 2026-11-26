import { useMemo, useState, type FormEvent } from "react";
import { ChevronDown, ChevronUp, ClipboardCheck, Package, Search, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePrototype } from "@/context/PrototypeContext";
import { EmptyState, Metric, PageHeader, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { batchStatus, daysUntil, expiredQuantity, productStatus, stockAtCost, stockUnits } from "@/lib/inventory";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { ProductRecord } from "@/types/prototype";

type StockFilter = "ALL" | "LOW" | "EXPIRING" | "OUT";

function matchesFilter(product: ProductRecord, filter: StockFilter): boolean {
  const status = productStatus(product);
  if (filter === "ALL") return true;
  if (filter === "LOW") return status === "LOW STOCK";
  if (filter === "EXPIRING") return status === "EXPIRING" || status === "EXPIRED";
  return status === "OUT OF STOCK" || status === "EXPIRED";
}

export default function InventoryPage() {
  const { hasPermission } = useAuth();
  const { products, stockMovements, adjustStock, activeBranch } = usePrototype();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StockFilter>("ALL");
  const [selected, setSelected] = useState<ProductRecord | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("Cycle count correction");
  const [error, setError] = useState("");
  const canAdjust = hasPermission("inventory:adjust") || hasPermission("inventory:count");

  const filtered = useMemo(() => products.filter((product) => {
    const term = query.trim().toLowerCase();
    const matchesQuery = !term || [product.name, product.sku, product.batch, product.category].some((value) => value.toLowerCase().includes(term));
    return matchesQuery && matchesFilter(product, filter);
  }), [filter, products, query]);

  const stockValue = stockAtCost(products);
  const lowCount = products.filter((product) => product.stock <= product.reorderPoint).length;
  const expiringCount = products.filter((product) => product.batches.some((batch) => batch.quantity > 0 && daysUntil(batch.expiry) <= 90)).length;
  const units = stockUnits(products);
  const expiredUnits = products.reduce((sum, product) => sum + expiredQuantity(product), 0);

  const openAdjustment = (product: ProductRecord) => {
    setSelected(product);
    setCounts(Object.fromEntries(product.batches.map((batch) => [batch.id, String(batch.quantity)])));
    setReason("Cycle count correction");
    setError("");
  };

  const submitAdjustment = (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setError("");
    try {
      adjustStock(
        selected.id,
        Object.entries(counts).map(([batchId, quantity]) => ({ batchId, quantity: Number(quantity) })),
        reason,
      );
      toast({ variant: "success", title: `${selected.sku} stock updated`, description: `Counted batches are now on the ledger. A movement and audit record were saved for ${activeBranch.code}.` });
      setSelected(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save this stock count.");
    }
  };

  return (
    <div>
      <PageHeader eyebrow={`${activeBranch.code} · ${activeBranch.name} · Batch ledger`} title="Inventory" description="Every unit belongs to a batch with its own expiry. Sales draw first-expiry-first-out; counting is recorded per batch so expired or damaged stock can be written off cleanly." />
      <section className="mb-6 grid gap-5 border-y border-[#cbdce5] py-5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Inventory summary">
        <Metric label="Units sellable" value={units.toLocaleString()} note={`${expiredUnits.toLocaleString()} expired units excluded`} />
        <Metric label="Stock at cost" value={formatCurrency(stockValue)} note={`${products.length} products at ${activeBranch.code}`} />
        <Metric label="At reorder point" value={String(lowCount)} note="Review for the next purchase order" />
        <Metric label="Expiry watch" value={String(expiringCount)} note="Any batch due within 90 days" />
      </section>

      {selected && <section className="mb-6 border-l-4 border-[#087f8c] bg-white p-5 shadow-[0_1px_2px_rgb(16_42_67/0.05)]" aria-labelledby="count-title">
        <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Physical stock count</p><h2 id="count-title" className="section-title mt-1">{selected.name}</h2><p className="meta mt-1">{selected.sku} · {selected.batches.length} batch records · system balance {selected.stock}</p></div><button type="button" onClick={() => setSelected(null)} className="inline-flex h-11 w-11 items-center justify-center rounded hover:bg-[#e5f5f1]" aria-label="Close stock count"><X aria-hidden="true" className="h-5 w-5" /></button></div>
        <form onSubmit={submitAdjustment} className="mt-5">
          <div className="table-shell mb-4">
            <table className="data-table min-w-[640px]">
              <thead><tr><th scope="col">Batch</th><th scope="col">Expiry</th><th scope="col">System</th><th scope="col">Counted units</th></tr></thead>
              <tbody>{selected.batches.map((batch) => {
                const days = daysUntil(batch.expiry);
                return <tr key={batch.id}>
                  <td className="font-semibold text-[#102a43]">{batch.batchNumber}</td>
                  <td>{formatDate(batch.expiry)}<p className={`mt-1 text-xs ${days < 0 ? "text-[#a12c2c]" : days <= 90 ? "text-[#855b13]" : "text-[#486581]"}`}>{days < 0 ? `expired ${Math.abs(days)} days ago` : `${days} days remaining`}</p></td>
                  <td>{batch.quantity}</td>
                  <td><label className="sr-only" htmlFor={`count-${batch.id}`}>Counted units for {batch.batchNumber}</label><input id={`count-${batch.id}`} className="text-input w-32" type="number" min="0" step="1" required value={counts[batch.id] ?? ""} onChange={(event) => setCounts((current) => ({ ...current, [batch.id]: event.target.value }))} /></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          <div className="grid items-end gap-4 md:grid-cols-[minmax(0,20rem)_auto]">
            <div><label className="field-label" htmlFor="count-reason">Reason</label><select id="count-reason" className="select-input" value={reason} onChange={(event) => setReason(event.target.value)}><option>Cycle count correction</option><option>Damaged stock</option><option>Expired stock removed</option><option>Transfer discrepancy</option><option>Other verified variance</option></select></div>
            <Button type="submit"><ClipboardCheck aria-hidden="true" className="mr-2 h-4 w-4" />Save count</Button>
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-[#a12c2c]">{error}</p>}
          <p className="mt-3 text-xs text-[#486581]">The previous balance of every batch remains in the movement ledger and audit trail.</p>
        </form>
      </section>}

      <section aria-labelledby="stock-list-title">
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div><h2 id="stock-list-title" className="section-title">Batch stock ledger</h2><p className="meta mt-1">Sellable quantity excludes expired batches and committed stock.</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div><label className="sr-only" htmlFor="stock-filter">Filter stock status</label><select id="stock-filter" className="select-input min-w-40" value={filter} onChange={(event) => setFilter(event.target.value as StockFilter)}><option value="ALL">All stock statuses</option><option value="LOW">Low stock</option><option value="EXPIRING">Expiry watch</option><option value="OUT">Out of stock</option></select></div>
            <div className="relative"><label className="sr-only" htmlFor="inventory-search">Search inventory</label><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#6b8299]" /><input id="inventory-search" className="text-input pl-10 sm:w-72" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Product, SKU, or batch" /></div>
          </div>
        </div>
        <div className="table-shell">
          {filtered.length === 0 ? <EmptyState title="No stock records found" description="Try a different product name or clear the status filter." action={<Button variant="outline" onClick={() => { setQuery(""); setFilter("ALL"); }}>Clear filters</Button>} /> : <table className="data-table min-w-[980px]">
            <caption className="sr-only">Current branch inventory with batch and expiry details</caption>
            <thead><tr><th scope="col">Product</th><th scope="col">Next batch</th><th scope="col" className="text-right">Sellable</th><th scope="col" className="text-right">Reorder at</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{filtered.map((product) => {
              const status = productStatus(product);
              const isExpanded = expanded === product.id;
              const days = product.expiry ? daysUntil(product.expiry) : null;
              return (
                <tr key={product.id}>
                  <td>
                    <p className="font-semibold text-[#102a43]">{product.name}</p>
                    <p className="mt-1 text-xs text-[#486581]">{product.sku} · {product.category} · {product.batches.length} batch{product.batches.length === 1 ? "" : "es"}</p>
                    <button type="button" onClick={() => setExpanded(isExpanded ? null : product.id)} aria-expanded={isExpanded} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#087f8c] hover:underline">
                      {isExpanded ? <ChevronUp aria-hidden="true" className="h-3.5 w-3.5" /> : <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />}{isExpanded ? "Hide batches" : "View batches"}
                    </button>
                    {isExpanded && <ul className="mt-3 space-y-2 border-l-2 border-[#cbdce5] pl-3">
                      {product.batches.map((batch) => {
                        const batchDays = daysUntil(batch.expiry);
                        return <li key={batch.id} className="text-xs text-[#486581]">
                          <span className="font-semibold text-[#102a43]">{batch.batchNumber}</span> · {batch.quantity} units · expires {formatDate(batch.expiry)}
                          {batchDays < 0 && <span className="ml-2 font-semibold text-[#a12c2c]">expired</span>}
                          {batchDays >= 0 && batchDays <= 90 && <span className="ml-2 font-semibold text-[#855b13]">{batchDays} days</span>}
                        </li>;
                      })}
                    </ul>}
                  </td>
                  <td><p>{product.batch}</p><p className={`mt-1 text-xs ${days !== null && days <= 90 ? "font-semibold text-[#855b13]" : "text-[#486581]"}`}>{product.expiry ? formatDate(product.expiry) : "—"}{days !== null && days >= 0 && days <= 90 ? ` · ${days} days` : days !== null && days < 0 ? " · expired" : ""}</p></td>
                  <td className="text-right"><strong className="text-base text-[#102a43]">{product.stock}</strong><p className="text-xs text-[#486581]">{product.unit}{product.stock === 1 ? "" : "s"}</p></td>
                  <td className="text-right">{product.reorderPoint}</td>
                  <td><StatusBadge status={status} />{product.batches.some((batch) => batchStatus(batch) === "EXPIRED" && batch.quantity > 0) && <p className="mt-1 text-[11px] font-semibold text-[#a12c2c]">expired batch on hand</p>}</td>
                  <td className="text-right"><Button variant="outline" size="sm" onClick={() => openAdjustment(product)} disabled={!canAdjust}>{canAdjust ? "Count / adjust" : "Read only"}</Button></td>
                </tr>
              );
            })}</tbody>
          </table>}
        </div>
        {!canAdjust && <p className="mt-3 text-xs text-[#486581]">Your role can review batch records but cannot change stock balances.</p>}
      </section>

      <section className="mt-8" aria-labelledby="movement-title">
        <div className="mb-4 flex items-center gap-2"><Package aria-hidden="true" className="h-5 w-5 text-[#087f8c]" /><div><h2 id="movement-title" className="section-title">Recent stock movements</h2><p className="meta mt-1">Sales, GRN receipts, returns, and approved count corrections at {activeBranch.code}.</p></div></div>
        <div className="table-shell">{stockMovements.filter((movement) => movement.branchId === activeBranch.id).length === 0 ? <EmptyState title="No new movements at this branch" description="Complete a sale, receive a purchase order, process a return, or save a stock count. The movement will appear here." /> : <table className="data-table min-w-[860px]"><thead><tr><th scope="col">Date</th><th scope="col">Product</th><th scope="col">Batch</th><th scope="col">Type / reference</th><th scope="col" className="text-right">Change</th><th scope="col" className="text-right">Batch balance</th><th scope="col">Recorded by</th></tr></thead><tbody>{stockMovements.filter((movement) => movement.branchId === activeBranch.id).slice(0, 10).map((movement) => <tr key={movement.id}><td>{formatDateTime(movement.createdAt)}</td><td className="font-semibold text-[#102a43]">{movement.productName}</td><td>{movement.batchNumber ?? "—"}</td><td>{movement.type}<p className="text-xs text-[#486581]">{movement.reason}</p></td><td className={`text-right font-semibold ${movement.quantity < 0 ? "text-[#a12c2c]" : "text-[#087f8c]"}`}>{movement.quantity >= 0 ? "+" : ""}{movement.quantity}</td><td className="text-right">{movement.balance}</td><td>{movement.actor}</td></tr>)}</tbody></table>}</div>
      </section>
    </div>
  );
}
