import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle as TriangleAlert,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Boxes,
  CalendarClock,
  CheckCircle2,
  FileBarChart,
  Package,
  PackagePlus,
  Receipt as ReceiptText,
  ShoppingCart,
  UploadCloud as CloudUpload,
  Wifi,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PERMISSIONS } from "@wellspring/shared";
import { useAuth } from "@/context/AuthContext";
import { usePrototype } from "@/context/PrototypeContext";
import { Button } from "@/components/ui/button";
import { EmptyState, StatusBadge } from "@/components/shared";
import {
  buildSalesTrend,
  getBranchPerformance,
  getDashboardMetrics,
  getFastMovingProducts,
  getStockAlerts,
  getStockCategories,
} from "@/lib/dashboard";
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

type Permission = keyof typeof PERMISSIONS;
type Icon = LucideIcon;

interface QuickAction {
  label: string;
  description: string;
  to: string;
  icon: Icon;
  permissions: Permission[];
  className: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "New sale",
    description: "Start a customer receipt",
    to: "/pos",
    icon: ShoppingCart,
    permissions: ["sales:create"],
    className: "bg-[var(--dashboard-mint)] text-[#087f8c]",
  },
  {
    label: "Manage inventory",
    description: "Review stock and batches",
    to: "/inventory",
    icon: Package,
    permissions: ["inventory:read", "inventory:batch_manage"],
    className: "bg-[var(--dashboard-blue)] text-[#2563a8]",
  },
  {
    label: "New purchase",
    description: "Draft a supplier order",
    to: "/purchasing",
    icon: PackagePlus,
    permissions: ["purchasing:create_po"],
    className: "bg-[var(--dashboard-lavender)] text-[#65538f]",
  },
  {
    label: "View reports",
    description: "Analyze sales and products",
    to: "/reports",
    icon: FileBarChart,
    permissions: ["reports:branch_sales", "reports:inventory", "reports:consolidated"],
    className: "bg-[var(--dashboard-amber)] text-[#855b13]",
  },
];

const CATEGORY_COLORS = ["#087f8c", "#4f8fc9", "#8c7bb8", "#d4a94e", "#4fb69f", "#a9bfca"];


function MetricCard({ label, value, note, icon: CardIcon, className }: {
  label: string;
  value: string;
  note: string;
  icon: Icon;
  className: string;
}) {
  return (
    <article className="dashboard-card flex min-w-0 items-start justify-between gap-4 p-5">
      <div className="min-w-0">
        <h2 className="text-xs font-semibold uppercase tracking-[0.08em] dashboard-secondary">{label}</h2>
        <p className="mt-3 truncate font-display text-[1.75rem] font-bold leading-none tracking-[-0.025em] text-[#102a43]" title={value}>{value}</p>
        <p className="mt-3 text-xs leading-5 dashboard-secondary">{note}</p>
      </div>
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", className)}>
        <CardIcon aria-hidden className="h-5 w-5" strokeWidth={1.8} />
      </span>
    </article>
  );
}

function SectionHeading({ id, title, description, action }: {
  id: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h2 id={id} className="dashboard-section-heading">{title}</h2>
        <p className="mt-1 text-xs leading-5 dashboard-secondary">{description}</p>
      </div>
      {action}
    </div>
  );
}

export default function DashboardPage() {
  const { user, hasAnyPermission } = useAuth();
  const {
    sales, allSales, products, branches, activeBranch, canSwitchBranch, switchBranch, isOnline, offlineQueue,
  } = usePrototype();
  const now = useMemo(() => new Date(), []);
  const metrics = useMemo(() => getDashboardMetrics(sales, products, now), [now, products, sales]);
  const trend = useMemo(() => buildSalesTrend(sales, now), [now, sales]);
  const categories = useMemo(() => getStockCategories(products), [products]);
  const alerts = useMemo(() => getStockAlerts(products, now), [now, products]);
  const fastMoving = useMemo(() => getFastMovingProducts(sales), [sales]);
  const branchPerformance = useMemo(() => getBranchPerformance(allSales, branches, now), [allSales, branches, now]);
  const networkRevenue = branchPerformance.reduce((sum, branch) => sum + branch.revenue, 0);
  const topBranchRevenue = Math.max(1, ...branchPerformance.map((branch) => branch.revenue));
  const recentSales = useMemo(
    () => [...sales].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6),
    [sales],
  );
  const visibleActions = QUICK_ACTIONS.filter((action) => hasAnyPermission(...action.permissions));
  const canCreateSale = hasAnyPermission("sales:create");
  const canViewInventory = hasAnyPermission("inventory:read", "inventory:batch_manage");
  const canViewReports = hasAnyPermission("reports:branch_sales", "reports:inventory", "reports:consolidated");
  const weekRevenue = trend.reduce((sum, day) => sum + day.revenue, 0);
  const maxFastMovingUnits = Math.max(0, ...fastMoving.map((product) => product.units));
  const firstName = user?.name.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="eyebrow mb-2">{formatDate(now, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          <h1 className="font-display text-[2rem] font-bold leading-tight tracking-[-0.025em] text-[#102a43] flip:text-[2.25rem]">Welcome back, {firstName}.</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm dashboard-secondary">
            <span>{activeBranch.code} · {activeBranch.name}</span>
            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-[#91a8b8]" />
            <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", isOnline ? "text-[#087f8c]" : "text-[#855b13]")}>
              {isOnline ? <Wifi aria-hidden className="h-3.5 w-3.5" /> : <WifiOff aria-hidden className="h-3.5 w-3.5" />}
              {isOnline ? "Connected" : "Working offline"}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {offlineQueue.length > 0 && (
            <Button asChild variant="outline">
              <Link to="/offline"><CloudUpload aria-hidden className="mr-2 h-4 w-4" />{offlineQueue.length} pending sync</Link>
            </Button>
          )}
          {canCreateSale && (
            <Button asChild size="lg" className="rounded-xl">
              <Link to="/pos"><ShoppingCart aria-hidden className="mr-2 h-4 w-4" />New sale</Link>
            </Button>
          )}
        </div>
      </header>

      <section className="grid gap-4 fold:grid-cols-2 xl:grid-cols-4" aria-label="Today's operational summary">
        <MetricCard label="Today's sales" value={formatCurrency(metrics.todayRevenue)} note="Gross receipts, VAT included" icon={Banknote} className="bg-[var(--dashboard-mint)] text-[#087f8c]" />
        <MetricCard label="Transactions" value={metrics.todayTransactions.toLocaleString()} note="Completed since midnight" icon={ReceiptText} className="bg-[var(--dashboard-blue)] text-[#2563a8]" />
        <MetricCard label="Inventory units" value={metrics.inventoryUnits.toLocaleString()} note={`${products.length} products at ${activeBranch.code}`} icon={Boxes} className="bg-[var(--dashboard-lavender)] text-[#65538f]" />
        <MetricCard label="Low-stock products" value={metrics.lowStockCount.toLocaleString()} note="At or below reorder point" icon={TriangleAlert} className="bg-[var(--dashboard-amber)] text-[#855b13]" />
      </section>

      {canSwitchBranch && (
        <section className="dashboard-card min-w-0 p-5 sm:p-6" aria-labelledby="network-title">
          <SectionHeading
            id="network-title"
            title="Today across the network"
            description={`${formatCurrency(networkRevenue)} gross across all eight branches · ${activeBranch.code} is open in this workspace`}
            action={<span className="rounded-full bg-[#e3f0fa] px-3 py-1 text-xs font-semibold text-[#2563a8]">Consolidated</span>}
          />
          <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {branchPerformance.map((branch) => (
              <li key={branch.branchId}>
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate font-semibold text-[#102a43]">{branch.code} · {branch.name}<span className="ml-1 font-normal text-[#6b8299]">{branch.city}</span></span>
                  <span className="shrink-0 tabular-nums text-[#39566d]">{formatCurrency(branch.revenue)} · {branch.transactions} rcpt</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e4eef3]" aria-hidden="true">
                    <div className="h-full rounded-full bg-[#087f8c]" style={{ width: `${(branch.revenue / topBranchRevenue) * 100}%` }} />
                  </div>
                  {branch.branchId === activeBranch.id ? <span className="text-[11px] font-semibold text-[#087f8c]">Viewing</span> : <button type="button" onClick={() => switchBranch(branch.branchId)} className="text-[11px] font-semibold text-[#486581] underline underline-offset-4 hover:text-[#102a43]">Open</button>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {visibleActions.length > 0 && (
        <section aria-labelledby="quick-actions-title">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="quick-actions-title" className="dashboard-section-heading">Quick actions</h2>
            <p className="text-xs dashboard-secondary">Shortcuts for your role</p>
          </div>
          <div className="grid gap-3 fold:grid-cols-2 xl:grid-cols-4">
            {visibleActions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <Link key={action.to} to={action.to} className="dashboard-card dashboard-card-action group flex min-h-24 items-center gap-4 p-4 hover:-translate-y-0.5">
                  <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", action.className)}>
                    <ActionIcon aria-hidden className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[#102a43]">{action.label}</span>
                    <span className="mt-1 block text-xs leading-5 dashboard-secondary">{action.description}</span>
                  </span>
                  <ArrowUpRight aria-hidden className="h-4 w-4 shrink-0 text-[#6b8299] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid items-stretch gap-5 tablet:grid-cols-[minmax(0,1.75fr)_minmax(18rem,1fr)]">
        <section className="dashboard-card min-w-0 p-5 sm:p-6" aria-labelledby="dashboard-sales-title">
          <SectionHeading
            id="dashboard-sales-title"
            title="Sales activity"
            description={`${formatCurrency(weekRevenue)} gross sales over the last seven days`}
            action={<span className="rounded-full bg-[var(--dashboard-mint)] px-3 py-1 text-xs font-semibold text-[#087f8c]">7 days</span>}
          />
          {sales.length === 0 ? (
            <EmptyState title="No sales recorded yet" description="Completed receipts will appear here as a seven-day sales trend." action={canCreateSale ? <Button asChild variant="outline"><Link to="/pos">Start the first sale</Link></Button> : undefined} />
          ) : (
            <>
              <div className="h-64 w-full" role="img" aria-label={`Line chart of daily gross sales from ${trend[0]?.label} to ${trend.at(-1)?.label}, totaling ${formatCurrency(weekRevenue)}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fill: "#526f84", fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={12} />
                    <YAxis tick={{ fill: "#526f84", fontSize: 10 }} tickLine={false} axisLine={false} width={52} tickFormatter={(value: number) => `₱${value.toLocaleString()}`} />
                    <Tooltip formatter={(value: number | string) => [formatCurrency(Number(value)), "Gross sales"]} contentStyle={{ border: "none", borderRadius: 14, boxShadow: "0 10px 30px rgb(16 42 67 / 0.14)", fontSize: 12 }} />
                    <Line type="monotone" dataKey="revenue" stroke="#087f8c" strokeWidth={2.5} dot={{ fill: "#ffffff", stroke: "#087f8c", strokeWidth: 2, r: 4 }} activeDot={{ fill: "#087f8c", r: 5 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 rounded-xl bg-[#f6fafc] px-4 py-3 text-xs dashboard-secondary">
                <span><strong className="font-semibold text-[#102a43]">{trend.reduce((sum, day) => sum + day.transactions, 0)}</strong> receipts this week</span>
                <span><strong className="font-semibold text-[#102a43]">{formatCurrency(metrics.todayRevenue)}</strong> received today</span>
              </div>
            </>
          )}
        </section>

        <section className="dashboard-card min-w-0 p-5 sm:p-6" aria-labelledby="dashboard-categories-title">
          <SectionHeading id="dashboard-categories-title" title="Stock by category" description="Current units across the medicine catalog" />
          {categories.length === 0 || metrics.inventoryUnits === 0 ? (
            <EmptyState title="No stock to categorize" description="Receive inventory to build the category breakdown." action={canViewInventory ? <Button asChild variant="outline"><Link to="/inventory">Open inventory</Link></Button> : undefined} />
          ) : (
            <>
              <div className="relative mx-auto h-44 max-w-64" role="img" aria-label={`Donut chart of ${metrics.inventoryUnits} stock units across ${categories.length} categories`}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categories} dataKey="units" nameKey="name" innerRadius={52} outerRadius={76} paddingAngle={3} stroke="none" isAnimationActive={false}>
                      {categories.map((category, index) => <Cell key={category.name} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number | string) => [Number(value).toLocaleString(), "Units"]} contentStyle={{ border: "none", borderRadius: 14, boxShadow: "0 10px 30px rgb(16 42 67 / 0.14)", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <strong className="font-display text-2xl text-[#102a43]">{metrics.inventoryUnits.toLocaleString()}</strong>
                  <span className="text-[11px] dashboard-secondary">units on hand</span>
                </div>
              </div>
              <ul className="mt-4 space-y-3">
                {categories.slice(0, 5).map((category, index) => (
                  <li key={category.name} className="flex items-center gap-2 text-xs">
                    <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }} />
                    <span className="min-w-0 flex-1 truncate text-[#39566d]" title={category.name}>{category.name}</span>
                    <span className="font-semibold tabular-nums text-[#102a43]">{category.units.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,1fr)]">
        <section className="dashboard-card min-w-0 overflow-hidden" aria-labelledby="recent-sales-title">
          <div className="p-5 pb-0 sm:p-6 sm:pb-0">
            <SectionHeading
              id="recent-sales-title"
              title="Recent sales"
              description="Newest receipts and their synchronization status"
              action={canViewReports ? <Link to="/reports" className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-[#087f8c] hover:underline">View reports<ArrowRight aria-hidden className="h-3.5 w-3.5" /></Link> : undefined}
            />
          </div>
          {recentSales.length === 0 ? (
            <EmptyState title="No recent receipts" description="New transactions will appear here immediately after checkout." />
          ) : (
            <div className="table-scroll">
              <table className="w-full min-w-[600px] border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-[#f6fafc] dashboard-secondary">
                    <th scope="col" className="px-6 py-3 font-semibold">Receipt</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Cashier</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Payment</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Total</th>
                    <th scope="col" className="px-6 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale) => (
                    <tr key={sale.id}>
                      <td className="px-6 py-4"><p className="font-semibold text-[#102a43]">{sale.receiptNumber}</p><p className="mt-1 text-[11px] dashboard-secondary">{formatDateTime(sale.createdAt)}</p></td>
                      <td className="px-4 py-4 text-[#39566d]">{sale.cashier}</td>
                      <td className="px-4 py-4 text-[#39566d]">{sale.paymentMethod.replace("_", "-")}</td>
                      <td className="px-4 py-4 text-right font-semibold tabular-nums text-[#102a43]">{formatCurrency(sale.total)}</td>
                      <td className="px-6 py-4"><StatusBadge status={sale.offline ? "PENDING" : "SYNCED"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="grid min-w-0 grid-cols-1 gap-5">
          <section className="dashboard-card min-w-0 p-5 sm:p-6" aria-labelledby="stock-attention-title">
            <SectionHeading
              id="stock-attention-title"
              title="Stock attention"
              description={`${alerts.length} stock or expiry notice${alerts.length === 1 ? "" : "s"}`}
              action={canViewInventory ? <Link to="/inventory" className="inline-flex min-h-11 items-center text-xs font-semibold text-[#087f8c] hover:underline">Review stock</Link> : undefined}
            />
            {alerts.length === 0 ? (
              <div className="flex min-h-32 flex-col items-center justify-center rounded-xl bg-[var(--dashboard-mint)] px-5 py-6 text-center">
                <CheckCircle2 aria-hidden className="h-7 w-7 text-[#087f8c]" />
                <h3 className="mt-3 text-sm font-semibold text-[#102a43]">Stock looks healthy</h3>
                <p className="mt-1 text-xs leading-5 dashboard-secondary">No low-stock or approaching-expiry notices.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {alerts.slice(0, 4).map((alert) => (
                  <li key={`${alert.productId}-${alert.kind}`} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", alert.kind === "EXPIRY" ? "bg-[var(--dashboard-blue)] text-[#2563a8]" : "bg-[var(--dashboard-amber)] text-[#855b13]")}>
                      {alert.kind === "EXPIRY" ? <CalendarClock aria-hidden className="h-4 w-4" /> : <TriangleAlert aria-hidden className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-xs font-semibold text-[#102a43]" title={alert.name}>{alert.name}</h3>
                      <p className="mt-1 text-[11px] leading-4 dashboard-secondary">
                        {alert.kind === "STOCK" ? `${alert.stock} ${alert.unit}${alert.stock === 1 ? "" : "s"} left · minimum ${alert.reorderPoint}` : alert.daysRemaining !== null && alert.daysRemaining < 0 ? `Expired ${Math.abs(alert.daysRemaining)} days ago · ${alert.batch}` : `${alert.daysRemaining} days remaining · ${alert.batch}`}
                      </p>
                    </div>
                    <StatusBadge status={alert.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="dashboard-card min-w-0 p-5 sm:p-6" aria-labelledby="fast-moving-title">
            <SectionHeading id="fast-moving-title" title="Fast-moving products" description="Top five by units sold in the transaction register" />
            {fastMoving.length === 0 ? (
              <p className="rounded-xl bg-[#f6fafc] px-4 py-6 text-center text-xs leading-5 dashboard-secondary">Product rankings will appear after the first sale.</p>
            ) : (
              <ol className="space-y-4">
                {fastMoving.map((product, index) => (
                  <li key={product.productId}>
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eaf3f7] text-[11px] font-bold text-[#526f84]">{index + 1}</span>
                      <div className="min-w-0 flex-1"><h3 className="truncate text-xs font-semibold text-[#102a43]" title={product.name}>{product.name}</h3></div>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-[#102a43]">{product.units} units</span>
                    </div>
                    <div className="ml-10 mt-2 h-1.5 overflow-hidden rounded-full bg-[#e4eef3]" aria-hidden="true">
                      <div className="h-full rounded-full bg-[#4f8fc9]" style={{ width: `${maxFastMovingUnits ? (product.units / maxFastMovingUnits) * 100 : 0}%` }} />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
