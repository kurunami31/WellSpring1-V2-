import { useMemo, useState } from "react";
import { AlertTriangle, RotateCcw, Search, ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePrototype } from "@/context/PrototypeContext";
import { EmptyState, Metric, PageHeader, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { SaleRecord, SaleStatus } from "@/types/prototype";

type StatusFilter = "ALL" | SaleStatus;

function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

export default function ReturnsPage() {
  const { hasPermission } = useAuth();
  const { sales, voidSale, refundSale, activeBranch, auditLog } = usePrototype();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [selected, setSelected] = useState<SaleRecord | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const canVoid = hasPermission("sales:void");
  const canRefund = hasPermission("sales:refund");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return sales.filter((sale) => {
      const matchesQuery = !term || [sale.receiptNumber, sale.cashier, sale.customerType].some((value) => value.toLowerCase().includes(term));
      return matchesQuery && (filter === "ALL" || sale.status === filter);
    });
  }, [filter, query, sales]);

  const completed = sales.filter((sale) => sale.status === "COMPLETED");
  const todayCompleted = completed.filter((sale) => isToday(sale.createdAt));
  const refundedValue = sales.filter((sale) => sale.status === "REFUNDED").reduce((sum, sale) => sum + (sale.refundAmount ?? sale.total), 0);
  const returnedEvents = auditLog.filter((entry) => entry.action === "Sale voided" || entry.action === "Refund processed").slice(0, 6);

  const open = (sale: SaleRecord) => {
    setSelected(sale);
    setReason("");
    setError("");
  };

  const submit = (kind: "VOID" | "REFUND") => {
    if (!selected) return;
    setError("");
    try {
      if (!reason.trim() || reason.trim().length < 8) {
        throw new Error("Record a specific reason of at least 8 characters for the audit trail.");
      }
      if (kind === "VOID") voidSale(selected.id, reason);
      else refundSale(selected.id, reason);
      toast({
        variant: "success",
        title: kind === "VOID" ? `${selected.receiptNumber} voided` : `${selected.receiptNumber} refunded`,
        description: "Batch quantities were returned to stock and the decision is in the audit trail.",
      });
      setSelected(null);
      setReason("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The transaction could not be reversed.");
    }
  };

  return (
    <div>
      <PageHeader eyebrow={`${activeBranch.code} · Customer care · Reversals`} title="Returns & voids" description="Voids are limited to today's receipts and put stock straight back into its original batch. Refunds cover earlier purchases and keep the reason, approver, and amount on record." />
      <section className="mb-6 grid gap-5 border-y border-[#cbdce5] py-5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Returns summary">
        <Metric label="Receipts today" value={String(todayCompleted.length)} note="Eligible for same-day void" />
        <Metric label="Refunded value" value={formatCurrency(refundedValue)} note={`${sales.filter((sale) => sale.status === "REFUNDED").length} refunded receipts`} />
        <Metric label="Voided receipts" value={String(sales.filter((sale) => sale.status === "VOIDED").length)} note="Cancelled before leaving the counter" />
        <Metric label="Reversal events" value={String(returnedEvents.length)} note="Recent entries in the audit trail" />
      </section>

      {selected && <section className="mb-6 border-l-4 border-[#855b13] bg-white p-5" aria-labelledby="reversal-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Reversal review</p>
            <h2 id="reversal-title" className="section-title mt-1">{selected.receiptNumber} · {formatCurrency(selected.total)}</h2>
            <p className="meta mt-1">{formatDateTime(selected.createdAt)} · {selected.cashier} · {selected.paymentMethod.replace("_", "-")} · {selected.items.length} line{selected.items.length === 1 ? "" : "s"}</p>
          </div>
          <button type="button" onClick={() => setSelected(null)} className="inline-flex h-11 w-11 items-center justify-center rounded hover:bg-[#e5f5f1]" aria-label="Close reversal panel"><X aria-hidden="true" className="h-5 w-5" /></button>
        </div>
        <ul className="mt-4 space-y-2 border-y border-[#cbdce5] py-3 text-sm">
          {selected.items.map((item) => <li key={item.productId} className="flex flex-wrap items-baseline justify-between gap-2">
            <span><strong>{item.productName}</strong> <span className="text-xs text-[#486581]">· {item.quantity} × {formatCurrency(item.unitPrice)} · {item.batchAllocations.map((allocation) => allocation.batchNumber).join(", ")}</span></span>
            <span>{formatCurrency(item.lineTotal)}</span>
          </li>)}
        </ul>
        <div className="mt-4">
          <label className="field-label" htmlFor="return-reason">Reason for the record</label>
          <textarea id="return-reason" className="text-input min-h-24" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Adverse reaction reported; full refund approved by the branch manager." />
        </div>
        {error && <p role="alert" className="mt-3 border-l-4 border-[#a12c2c] bg-[#fae9e7] px-3 py-2 text-sm text-[#a12c2c]">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {canVoid && isToday(selected.createdAt) && <Button onClick={() => submit("VOID")} variant="outline"><AlertTriangle aria-hidden="true" className="mr-2 h-4 w-4" />Void this receipt</Button>}
          {canRefund && <Button onClick={() => submit("REFUND")}><RotateCcw aria-hidden="true" className="mr-2 h-4 w-4" />Refund {formatCurrency(selected.total)}</Button>}
          {!canVoid && !canRefund && <p className="text-sm text-[#486581]">Cashier and supervisor roles can void same-day receipts; supervisors and branch managers can refund.</p>}
          {canVoid && !canRefund && !isToday(selected.createdAt) && !canRefund && <p className="text-sm text-[#486581]">This receipt is from an earlier day. Ask a supervisor or branch manager to process a refund.</p>}
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs text-[#486581]"><ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />Reversals restore the exact batch and expiry, then wait for a supervisor review in the audit trail.</p>
      </section>}

      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><h2 className="section-title">Transaction register</h2><p className="meta mt-1">Search a receipt, then void or refund from one place.</p></div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div><label className="sr-only" htmlFor="return-filter">Filter receipts</label><select id="return-filter" className="select-input min-w-40" value={filter} onChange={(event) => setFilter(event.target.value as StatusFilter)}><option value="ALL">All receipts</option><option value="COMPLETED">Completed</option><option value="VOIDED">Voided</option><option value="REFUNDED">Refunded</option></select></div>
          <div className="relative"><label className="sr-only" htmlFor="return-search">Search receipts</label><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#6b8299]" /><input id="return-search" className="text-input pl-10 sm:w-64" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Receipt, cashier, customer" /></div>
        </div>
      </div>

      <div className="table-shell">
        {filtered.length === 0 ? <EmptyState title="No receipts match" description="Try a different search term or show all receipt statuses." action={<Button variant="outline" onClick={() => { setQuery(""); setFilter("ALL"); }}>Clear filters</Button>} /> : <table className="data-table min-w-[960px]">
          <thead><tr><th scope="col">Receipt / date</th><th scope="col">Cashier</th><th scope="col">Customer · payment</th><th scope="col" className="text-right">Total</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{filtered.slice(0, 40).map((sale) => <tr key={sale.id}>
            <td><p className="font-semibold text-[#102a43]">{sale.receiptNumber}</p><p className="mt-1 text-xs text-[#486581]">{formatDateTime(sale.createdAt)}</p></td>
            <td>{sale.cashier}</td>
            <td>{sale.customerType}<p className="text-xs text-[#486581]">{sale.paymentMethod.replace("_", "-")}{sale.loyaltyPhone ? ` · ${sale.loyaltyPhone}` : ""}</p></td>
            <td className="text-right font-semibold text-[#102a43]">{formatCurrency(sale.total)}</td>
            <td><StatusBadge status={sale.status} />{sale.status === "REFUNDED" && sale.refundReason && <p className="mt-1 max-w-56 truncate text-[11px] text-[#486581]" title={sale.refundReason}>{sale.refundReason}</p>}{sale.status === "VOIDED" && sale.voidReason && <p className="mt-1 max-w-56 truncate text-[11px] text-[#486581]" title={sale.voidReason}>{sale.voidReason}</p>}</td>
            <td className="text-right">{sale.status === "COMPLETED" ? <Button size="sm" variant="outline" onClick={() => open(sale)}>Review</Button> : <span className="text-xs text-[#486581]">{sale.voidedBy ?? sale.refundedBy}</span>}</td>
          </tr>)}</tbody>
        </table>}
      </div>

      <section className="mt-8" aria-labelledby="reversal-log-title">
        <h2 id="reversal-log-title" className="section-title">Reversal audit trail</h2>
        <p className="meta mt-1">Void and refund decisions at every branch, newest first.</p>
        <div className="table-shell mt-3">{returnedEvents.length === 0 ? <EmptyState title="No reversals recorded" description="Void or refund a receipt and the reason will appear here with the approving staff member." /> : <table className="data-table min-w-[720px]"><thead><tr><th scope="col">When</th><th scope="col">Action</th><th scope="col">Detail</th><th scope="col">By</th></tr></thead><tbody>{returnedEvents.map((entry) => <tr key={entry.id}><td className="whitespace-nowrap">{formatDateTime(entry.createdAt)}</td><td className="font-semibold text-[#102a43]">{entry.action}</td><td>{entry.detail}</td><td>{entry.actor}</td></tr>)}</tbody></table>}</div>
      </section>
    </div>
  );
}
