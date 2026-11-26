import type { ReactNode } from "react";
import { PackageSearch } from "lucide-react";

export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col justify-between gap-4 border-b border-[#cbdce5] pb-5 sm:flex-row sm:items-end">
      <div className="max-w-3xl">
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h1 className="page-title">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-[#486581]">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const palette = normalized === "RECEIVED" || normalized === "ACTIVE" || normalized === "IN STOCK" || normalized === "SYNCED"
    ? { background: "#ddf4ee", color: "#087f8c" }
    : normalized === "SENT" || normalized === "PENDING" || normalized === "LOW STOCK" || normalized === "EXPIRING"
      ? { background: "#fbf1d8", color: "#855b13" }
      : normalized === "OUT OF STOCK" || normalized === "INACTIVE" || normalized === "EXPIRED"
        ? { background: "#fae9e7", color: "#a12c2c" }
        : { background: "#e5f5f1", color: "#486581" };
  return <span className="status-badge whitespace-nowrap" style={palette}>{status}</span>;
}

export function EmptyState({ title, description, action }: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
      <PackageSearch aria-hidden="true" className="mb-3 h-8 w-8 text-[#6b8299]" strokeWidth={1.5} />
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-[#486581]">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="border-l-2 border-[#087f8c] pl-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#486581]">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-[#486581]">{note}</p>
    </div>
  );
}
