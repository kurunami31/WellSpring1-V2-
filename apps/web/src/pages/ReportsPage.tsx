import { useMemo, useState } from "react";
import { Download, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/context/AuthContext";
import { usePrototype } from "@/context/PrototypeContext";
import { EmptyState, Metric, PageHeader, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type ReportRange = "TODAY" | "7_DAYS" | "ALL";
type ReportScope = "BRANCH" | "ALL";

export default function ReportsPage() {
  const { hasAnyPermission } = useAuth();
  const { sales, allSales, branches, activeBranch } = usePrototype();
  const [range, setRange] = useState<ReportRange>("7_DAYS");
  const [scope, setScope] = useState<ReportScope>("BRANCH");
  const canConsolidate = hasAnyPermission("reports:consolidated");
  const source = canConsolidate && scope === "ALL" ? allSales : sales;

  const filteredSales = useMemo(() => {
    if (range === "ALL") return source;
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    if (range === "7_DAYS") cutoff.setDate(cutoff.getDate() - 6);
    return source.filter((sale) => new Date(sale.createdAt).getTime() >= cutoff.getTime());
  }, [range, source]);

  const completedSales = useMemo(() => filteredSales.filter((sale) => sale.status === "COMPLETED"), [filteredSales]);
  const revenue = completedSales.reduce((sum, sale) => sum + sale.total, 0);
  const units = completedSales.reduce((sum, sale) => sum + sale.items.reduce((lineSum, item) => lineSum + item.quantity, 0), 0);
  const discounts = completedSales.reduce((sum, sale) => sum + sale.discount + sale.loyaltyDiscount, 0);
  const average = completedSales.length ? revenue / completedSales.length : 0;
  const reversed = filteredSales.filter((sale) => sale.status !== "COMPLETED");

  const dailyData = useMemo(() => {
    const days: Array<{ key: string; label: string; sales: number; transactions: number }> = [];
    const dayCount = range === "TODAY" ? 1 : 7;
    for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const key = date.toISOString().slice(0, 10);
      days.push({ key, label: new Intl.DateTimeFormat("en-PH", range === "TODAY" ? { hour: "numeric" } : { weekday: "short", day: "numeric" }).format(date), sales: 0, transactions: 0 });
    }
    if (range === "ALL") {
      const groups = new Map<string, { label: string; sales: number; transactions: number }>();
      completedSales.forEach((sale) => {
        const date = new Date(sale.createdAt);
        const key = date.toISOString().slice(0, 10);
        const existing = groups.get(key) ?? { label: new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" }).format(date), sales: 0, transactions: 0 };
        existing.sales += sale.total;
        existing.transactions += 1;
        groups.set(key, existing);
      });
      return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => ({ ...value, sales: Math.round(value.sales * 100) / 100 }));
    }
    completedSales.forEach((sale) => {
      const key = new Date(sale.createdAt).toISOString().slice(0, 10);
      const day = days.find((candidate) => candidate.key === key);
      if (day) { day.sales += sale.total; day.transactions += 1; }
    });
    return days.map((day) => ({ ...day, sales: Math.round(day.sales * 100) / 100 }));
  }, [completedSales, range]);

  const productData = useMemo(() => {
    const products = new Map<string, { name: string; units: number; revenue: number }>();
    completedSales.forEach((sale) => sale.items.forEach((item) => {
      const existing = products.get(item.productId) ?? { name: item.productName.replace(/ (tablet|capsule).*$/, ""), units: 0, revenue: 0 };
      existing.units += item.quantity;
      existing.revenue += item.lineTotal;
      products.set(item.productId, existing);
    }));
    return Array.from(products.values()).sort((a, b) => b.units - a.units).slice(0, 5);
  }, [completedSales]);

  const exportCsv = () => {
    if (filteredSales.length === 0) return;
    const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const rows = [
      ["Receipt", "Date", "Branch", "Cashier", "Customer", "Payment", "Subtotal", "Discount", "Loyalty", "VAT", "Total", "Status", "Sync status"],
      ...filteredSales.map((sale) => [
        sale.receiptNumber, sale.createdAt, sale.branchCode, sale.cashier, sale.customerType, sale.paymentMethod,
        sale.subtotal, sale.discount, sale.loyaltyDiscount, sale.vat, sale.total, sale.status, sale.offline ? "Pending" : "Synced",
      ]),
    ];
    const csv = rows.map((row) => row.map(escape).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `wellspring-sales-${scope.toLowerCase()}-${range.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ variant: "success", title: "Sales report exported", description: `${filteredSales.length} transaction${filteredSales.length === 1 ? "" : "s"} saved as CSV.` });
  };

  return (
    <div>
      <PageHeader
        eyebrow={canConsolidate && scope === "ALL" ? "Head office · Consolidated view" : `${activeBranch.code} · ${activeBranch.name} · Branch view`}
        title="Sales reports"
        description="Totals come from the transaction register. Voided and refunded receipts stay visible but are excluded from revenue, units, and rankings."
        actions={<>
          {canConsolidate && <><label className="sr-only" htmlFor="report-scope">Report scope</label><select id="report-scope" className="select-input min-w-40" value={scope} onChange={(event) => setScope(event.target.value as ReportScope)}><option value="BRANCH">This branch</option><option value="ALL">All branches</option></select></>}
          <label className="sr-only" htmlFor="report-range">Report date range</label>
          <select id="report-range" className="select-input min-w-40" value={range} onChange={(event) => setRange(event.target.value as ReportRange)}><option value="TODAY">Today</option><option value="7_DAYS">Last 7 days</option><option value="ALL">All demo sales</option></select>
          <Button variant="outline" onClick={exportCsv} disabled={filteredSales.length === 0}><Download aria-hidden="true" className="mr-2 h-4 w-4" />Export CSV</Button>
        </>}
      />
      <section className="mb-6 grid gap-5 border-y border-[#cbdce5] py-5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Sales summary">
        <Metric label="Gross sales" value={formatCurrency(revenue)} note={`${completedSales.length} completed transactions${reversed.length > 0 ? ` · ${reversed.length} reversed` : ""}`} />
        <Metric label="Average sale" value={formatCurrency(average)} note="Revenue per completed transaction" />
        <Metric label="Units sold" value={units.toLocaleString()} note="Across all product lines" />
        <Metric label="Discounts" value={formatCurrency(discounts)} note="Statutory and loyalty adjustments" />
      </section>

      {filteredSales.length === 0 ? <div className="panel"><EmptyState title="No sales in this period" description="Choose a wider date range or complete a sale at the point of sale. Report totals will update automatically." /></div> : <>
        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <section className="panel p-4 sm:p-5" aria-labelledby="sales-trend-title"><div className="mb-4 flex items-center gap-2"><TrendingUp aria-hidden="true" className="h-5 w-5 text-[#087f8c]" /><div><h2 id="sales-trend-title" className="section-title">Sales trend</h2><p className="meta mt-1">Gross receipts by transaction date, reversals excluded</p></div></div><div className="h-72 w-full" role="img" aria-label={`Line chart of sales totaling ${formatCurrency(revenue)} over the selected period`}><ResponsiveContainer width="100%" height="100%"><LineChart data={dailyData} margin={{ top: 8, right: 12, left: -4, bottom: 0 }}><CartesianGrid stroke="#dce8ee" vertical={false} /><XAxis dataKey="label" tick={{ fill: "#486581", fontSize: 11 }} axisLine={{ stroke: "#cbdce5" }} tickLine={false} /><YAxis tick={{ fill: "#486581", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value: number) => `₱${value}`} /><Tooltip formatter={(value: number | string) => [formatCurrency(Number(value)), "Gross sales"]} contentStyle={{ border: "1px solid #cbdce5", borderRadius: 4, fontSize: 12 }} /><Line type="monotone" dataKey="sales" stroke="#087f8c" strokeWidth={2} dot={{ fill: "#087f8c", r: 3 }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></div></section>
          <section className="panel p-4 sm:p-5" aria-labelledby="product-ranking-title"><div className="mb-4"><h2 id="product-ranking-title" className="section-title">Fast-moving products</h2><p className="meta mt-1">Top five products by units sold</p></div><div className="h-72 w-full" role="img" aria-label={`Bar chart of ${productData.length} top-selling products`}><ResponsiveContainer width="100%" height="100%"><BarChart data={productData} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}><CartesianGrid stroke="#dce8ee" horizontal={false} /><XAxis type="number" tick={{ fill: "#486581", fontSize: 11 }} axisLine={{ stroke: "#cbdce5" }} tickLine={false} /><YAxis type="category" dataKey="name" width={82} tick={{ fill: "#486581", fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip formatter={(value: number | string) => [value, "Units sold"]} contentStyle={{ border: "1px solid #cbdce5", borderRadius: 4, fontSize: 12 }} /><Bar dataKey="units" fill="#087f8c" radius={[0, 2, 2, 0]} /></BarChart></ResponsiveContainer></div></section>
        </div>

        <section className="mt-8" aria-labelledby="transactions-title"><div className="mb-4"><h2 id="transactions-title" className="section-title">Transaction register</h2><p className="meta mt-1">Newest first · voided and refunded receipts remain visible for reconciliation.</p></div><div className="table-shell"><table className="data-table min-w-[1000px]"><thead><tr><th scope="col">Receipt / date</th>{scope === "ALL" && <th scope="col">Branch</th>}<th scope="col">Cashier</th><th scope="col">Customer</th><th scope="col">Payment</th><th scope="col" className="text-right">Items</th><th scope="col" className="text-right">Total</th><th scope="col">Status</th><th scope="col">Sync</th></tr></thead><tbody>{filteredSales.slice(0, 15).map((sale) => <tr key={sale.id}><td><p className="font-semibold text-[#102a43]">{sale.receiptNumber}</p><p className="mt-1 text-xs text-[#486581]">{formatDateTime(sale.createdAt)}</p></td>{scope === "ALL" && <td>{branches.find((branch) => branch.id === sale.branchId)?.code ?? sale.branchCode}</td>}<td>{sale.cashier}</td><td>{sale.customerType}</td><td>{sale.paymentMethod.replace("_", "-")}</td><td className="text-right">{sale.items.reduce((sum, item) => sum + item.quantity, 0)}</td><td className="text-right font-semibold text-[#102a43]">{formatCurrency(sale.total)}</td><td><StatusBadge status={sale.status} /></td><td><StatusBadge status={sale.offline ? "PENDING" : "SYNCED"} /></td></tr>)}</tbody></table></div></section>
      </>}
    </div>
  );
}
