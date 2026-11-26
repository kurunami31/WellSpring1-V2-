import { useMemo, useState } from "react";
import { BadgeCheck, Building2, Mail, Phone, Search, ShieldAlert, Truck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePrototype } from "@/context/PrototypeContext";
import { EmptyState, Metric, PageHeader, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function SuppliersPage() {
  const { hasPermission } = useAuth();
  const { suppliers, purchaseOrders, toggleSupplierAccreditation, activeBranch } = usePrototype();
  const [query, setQuery] = useState("");
  const [onlyAccredited, setOnlyAccredited] = useState(false);
  const canManage = hasPermission("supplier:manage");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return suppliers.filter((supplier) => {
      const matchesQuery = !term || [supplier.name, supplier.code, supplier.category, supplier.contactPerson].some((value) => value.toLowerCase().includes(term));
      return matchesQuery && (!onlyAccredited || supplier.accredited);
    });
  }, [onlyAccredited, query, suppliers]);

  const accredited = suppliers.filter((supplier) => supplier.accredited);
  const openOrders = purchaseOrders.filter((order) => order.status !== "RECEIVED");
  const openValue = openOrders.reduce((sum, order) => sum + order.total, 0);
  const averageLead = suppliers.length ? Math.round(suppliers.reduce((sum, supplier) => sum + supplier.leadTimeDays, 0) / suppliers.length) : 0;

  const toggle = (supplierId: string, name: string, current: boolean) => {
    try {
      toggleSupplierAccreditation(supplierId);
      toast({
        variant: current ? "info" : "success",
        title: current ? `${name} accreditation suspended` : `${name} accreditation restored`,
        description: current ? "New purchase orders and approvals are blocked until this is reversed." : "The supplier can receive purchase orders again.",
      });
    } catch (caught) {
      toast({ variant: "error", title: "Supplier not updated", description: caught instanceof Error ? caught.message : "Try again." });
    }
  };

  return (
    <div>
      <PageHeader eyebrow={`${activeBranch.code} · Supplier desk · Directory`} title="Suppliers" description="Every order traces back to an accredited supplier, a payment term, and a receiving record. Suspending accreditation immediately blocks new purchase orders." />
      <section className="mb-6 grid gap-5 border-y border-[#cbdce5] py-5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Supplier summary">
        <Metric label="Accredited suppliers" value={`${accredited.length}/${suppliers.length}`} note="Licence and terms verified" />
        <Metric label="Open purchase value" value={formatCurrency(openValue)} note={`${openOrders.length} order${openOrders.length === 1 ? "" : "s"} at ${activeBranch.code}`} />
        <Metric label="Average lead time" value={`${averageLead} days`} note="Across the active directory" />
        <Metric label="Last delivery" value={suppliers.length ? formatDate(suppliers.map((supplier) => supplier.lastDelivery).sort().at(-1) ?? "") : "—"} note="Most recent confirmed receipt" />
      </section>

      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><h2 className="section-title">Trading partners</h2><p className="meta mt-1">Contact, terms, and accreditation in one place.</p></div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="inline-flex min-h-11 items-center gap-2 rounded border border-[#cbdce5] bg-white px-3 text-sm text-[#486581]">
            <input type="checkbox" className="h-4 w-4 accent-[#087f8c]" checked={onlyAccredited} onChange={(event) => setOnlyAccredited(event.target.checked)} />
            Accredited only
          </label>
          <div className="relative">
            <label className="sr-only" htmlFor="supplier-search">Search suppliers</label>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#6b8299]" />
            <input id="supplier-search" className="text-input pl-10 sm:w-64" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, code, or contact" />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? <div className="panel"><EmptyState title="No suppliers match" description="Try another name, or clear the accredited-only filter." action={<Button variant="outline" onClick={() => { setQuery(""); setOnlyAccredited(false); }}>Clear filters</Button>} /></div> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((supplier) => {
            const supplierOrders = purchaseOrders.filter((order) => order.supplierId === supplier.id);
            const supplierValue = supplierOrders.reduce((sum, order) => sum + order.total, 0);
            return <article key={supplier.id} className={`panel flex flex-col gap-4 p-5 ${supplier.accredited ? "" : "border-l-4 border-[#a12c2c]"}`}>
              <div className="flex items-start gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${supplier.accredited ? "bg-[#e5f5f1] text-[#087f8c]" : "bg-[#fae9e7] text-[#a12c2c]"}`}><Building2 aria-hidden="true" className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-lg font-bold">{supplier.name}</h3><StatusBadge status={supplier.accredited ? "ACCREDITED" : "BLOCKED"} /></div>
                  <p className="mt-1 text-xs text-[#486581]">{supplier.code} · {supplier.category} · rated {supplier.rating.toFixed(1)}/5</p>
                </div>
              </div>

              <dl className="grid gap-x-4 gap-y-2 text-xs text-[#486581] sm:grid-cols-2">
                <div><dt className="font-semibold uppercase tracking-[0.06em]">Contact</dt><dd className="mt-1">{supplier.contactPerson}</dd></div>
                <div><dt className="font-semibold uppercase tracking-[0.06em]">Payment terms</dt><dd className="mt-1">{supplier.terms} · {supplier.leadTimeDays}-day lead time</dd></div>
                <div className="sm:col-span-2"><dt className="sr-only">Reach</dt><dd className="flex flex-wrap items-center gap-x-4 gap-y-1"><span className="inline-flex items-center gap-1.5"><Phone aria-hidden="true" className="h-3.5 w-3.5" />{supplier.phone}</span><span className="inline-flex min-w-0 items-center gap-1.5"><Mail aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{supplier.email}</span></span></dd></div>
              </dl>

              <p className="text-xs leading-5 text-[#39566d]">{supplier.notes}</p>

              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[#cbdce5] pt-3">
                <p className="text-xs text-[#486581]"><Truck aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />{supplierOrders.length} order{supplierOrders.length === 1 ? "" : "s"} · {formatCurrency(supplierValue)} · last delivery {formatDate(supplier.lastDelivery)}</p>
                {canManage ? <Button variant={supplier.accredited ? "outline" : "secondary"} size="sm" onClick={() => toggle(supplier.id, supplier.name, supplier.accredited)}>
                  {supplier.accredited ? <ShieldAlert aria-hidden="true" className="mr-1.5 h-4 w-4" /> : <BadgeCheck aria-hidden="true" className="mr-1.5 h-4 w-4" />}
                  {supplier.accredited ? "Suspend" : "Restore"}
                </Button> : <span className="text-[11px] text-[#486581]">Purchasing officer manages accreditation</span>}
              </div>
            </article>;
          })}
        </div>
      )}
    </div>
  );
}
