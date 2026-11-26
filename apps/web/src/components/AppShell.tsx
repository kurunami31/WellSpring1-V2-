import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Building2,
  UploadCloud,
  Cross,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  RotateCcw,
  ShoppingCart,
  Truck,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { PERMISSIONS } from "@wellspring/shared";
import { useAuth } from "@/context/AuthContext";
import { usePrototype } from "@/context/PrototypeContext";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

type Permission = keyof typeof PERMISSIONS;

const navigation: Array<{
  to: string;
  label: string;
  shortLabel: string;
  icon: typeof ShoppingCart;
  permissions: Permission[];
}> = [
  { to: "/dashboard", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard, permissions: [] },
  { to: "/pos", label: "Point of sale", shortLabel: "POS", icon: ShoppingCart, permissions: ["sales:create", "sales:read"] },
  { to: "/inventory", label: "Inventory", shortLabel: "Stock", icon: Package, permissions: ["inventory:read", "inventory:batch_manage"] },
  { to: "/purchasing", label: "Purchasing", shortLabel: "Buying", icon: Truck, permissions: ["purchasing:read", "purchasing:grn"] },
  { to: "/suppliers", label: "Suppliers", shortLabel: "Suppliers", icon: Building2, permissions: ["purchasing:read", "supplier:manage"] },
  { to: "/returns", label: "Returns & voids", shortLabel: "Returns", icon: RotateCcw, permissions: ["sales:read"] },
  { to: "/reports", label: "Reports", shortLabel: "Reports", icon: FileBarChart, permissions: ["reports:branch_sales", "reports:inventory", "reports:consolidated"] },
  { to: "/offline", label: "Offline & sync", shortLabel: "Sync", icon: UploadCloud, permissions: [] },
  { to: "/admin", label: "Administration", shortLabel: "Admin", icon: Users, permissions: ["admin:users", "admin:audit"] },
];

export function AppShell() {
  const { user, logout, hasAnyPermission } = useAuth();
  const { isOnline, setOnline, offlineQueue, activeBranch, branches, activeBranchId, canSwitchBranch, switchBranch } = usePrototype();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const visibleNavigation = navigation.filter((item) => item.permissions.length === 0 || hasAnyPermission(...item.permissions));

  const toggleConnection = () => {
    setOnline(!isOnline);
    toast({
      variant: "info",
      title: isOnline ? "Offline mode enabled" : "Connection restored",
      description: isOnline ? "New sales will be saved to this device's sync queue." : "Open Offline & sync to upload queued sales.",
    });
  };

  const changeBranch = (branchId: string) => {
    try {
      switchBranch(branchId);
      toast({ variant: "success", title: "Branch switched", description: "Stock, purchasing, and sales now reflect the selected branch." });
    } catch (caught) {
      toast({ variant: "error", title: "Branch not changed", description: caught instanceof Error ? caught.message : "Try again." });
    }
  };

  const signOut = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f2f7fa]">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-[#102a43] lg:flex">
        <div className="flex h-20 items-center gap-3 px-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c9f7e8] text-[#087f8c]"><Cross aria-hidden="true" className="h-5 w-5" /></span>
          <div><p className="font-display text-lg font-bold text-white">WellSpring One</p><p className="text-[11px] uppercase tracking-[0.12em] text-[#a9c4d5]">Pharmacy operations</p></div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Main navigation">
          {visibleNavigation.map((item) => <NavigationItem key={item.to} item={item} queueCount={item.to === "/offline" ? offlineQueue.length : 0} />)}
        </nav>
        <div className="p-4">
          <div className="mb-4 rounded-xl bg-white/[0.06] px-3 py-3 text-xs leading-5 text-[#a9c4d5]">
            <p className="font-semibold text-white">{activeBranch.code} · {activeBranch.name}</p>
            <p className="truncate">{activeBranch.city} · Register 01</p>
            <p className="mt-1 text-[11px] text-[#8fb0c4]">{canSwitchBranch ? "Head-office view · 8 branches" : "Branch-assigned account"}</p>
          </div>
          <div className="flex items-center gap-3 px-1">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d9f7ee] text-[#087f8c]"><Cross aria-hidden="true" className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
              <p className="truncate text-xs capitalize text-[#a9c4d5]">{user?.role.replaceAll("_", " ").toLowerCase()}</p>
            </div>
          </div>
          <button type="button" onClick={signOut} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 text-sm font-semibold text-[#e5f5f1] transition-colors hover:bg-white/[0.16]">
            <LogOut aria-hidden="true" className="h-4 w-4" />Logout
          </button>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-3 bg-[#f2f7fa]/95 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 lg:hidden">
            <button type="button" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="mobile-menu" aria-label={menuOpen ? "Close navigation" : "Open navigation"}>
              {menuOpen ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
            </button>
            <span className="truncate font-display text-lg font-bold">WellSpring One</span>
          </div>
          <div className="hidden min-w-0 lg:block">
            <p className="text-xs uppercase tracking-[0.12em] text-[#486581]">{canSwitchBranch ? "Head-office view" : "Branch workstation"}</p>
            <div className="mt-0.5 flex items-center gap-2">
              {canSwitchBranch ? (
                <>
                  <label className="sr-only" htmlFor="branch-switcher">Active branch</label>
                  <select id="branch-switcher" className="max-w-[22rem] rounded-lg border border-[#cbdce5] bg-white px-2 py-1 text-sm font-semibold text-[#102a43]" value={activeBranchId} onChange={(event) => changeBranch(event.target.value)}>
                    {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.code} · {branch.name}</option>)}
                  </select>
                  <span className="text-xs text-[#486581]">Register 01</span>
                </>
              ) : (
                <p className="text-sm font-semibold">{activeBranch.code} · {activeBranch.name} · Register 01</p>
              )}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button type="button" onClick={toggleConnection} aria-pressed={!isOnline} aria-label={isOnline ? "Switch to offline mode" : "Restore online connection"} title={isOnline ? "Online — switch to offline mode" : "Offline — restore connection"} className={cn("inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold shadow-sm transition-colors", isOnline ? "bg-white text-[#486581] hover:bg-[#f6fafc]" : "bg-[#fbf1d8] text-[#855b13]")}>
              {isOnline ? <Wifi aria-hidden="true" className="h-4 w-4" /> : <WifiOff aria-hidden="true" className="h-4 w-4" />}
              <span className="hidden sm:inline">{isOnline ? "Online" : "Offline"}</span>
              {offlineQueue.length > 0 && <span className="rounded-full bg-[#102a43] px-1.5 py-0.5 text-[11px] text-white" aria-label={`${offlineQueue.length} queued sales`}>{offlineQueue.length}</span>}
            </button>
            <div className="hidden px-2 md:block lg:hidden">
              <p className="max-w-40 truncate text-sm font-semibold">{user?.name}</p>
              <p className="text-xs text-[#486581]">{activeBranch.code} · {activeBranch.name}</p>
            </div>
            <button type="button" onClick={signOut} className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#486581] hover:bg-[#e5f5f1] hover:text-[#102a43] lg:hidden" aria-label="Sign out"><LogOut aria-hidden="true" className="h-5 w-5" /></button>
          </div>
        </header>

        {menuOpen && <nav id="mobile-menu" className="bg-white p-3 lg:hidden" aria-label="Mobile navigation">
          {canSwitchBranch && (
            <div className="mb-3 px-2">
              <label className="field-label" htmlFor="mobile-branch-switcher">Active branch</label>
              <select id="mobile-branch-switcher" className="select-input" value={activeBranchId} onChange={(event) => changeBranch(event.target.value)}>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.code} · {branch.name}</option>)}
              </select>
            </div>
          )}
          <div className="grid gap-1 sm:grid-cols-2">
            {visibleNavigation.map((item) => <NavigationItem key={item.to} item={item} queueCount={item.to === "/offline" ? offlineQueue.length : 0} onSelect={() => setMenuOpen(false)} mobile />)}
          </div>
          <p className="mt-3 px-3 pt-3 text-xs text-[#486581]">{user?.name} · {activeBranch.code} {activeBranch.name}</p>
        </nav>}

        <main id="main-content" tabIndex={-1} className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
        <footer className="mx-auto flex max-w-[1600px] flex-col gap-1 px-4 py-5 text-xs text-[#486581] sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <span>WellSpring One · POS / Inventory / Supplier</span><span>{activeBranch.code} {activeBranch.name} · prototype data stays on this device.</span>
        </footer>
      </div>
    </div>
  );
}

function NavigationItem({ item, queueCount, onSelect, mobile = false }: {
  item: (typeof navigation)[number];
  queueCount: number;
  onSelect?: () => void;
  mobile?: boolean;
}) {
  const Icon = item.icon;
  return (
    <NavLink to={item.to} onClick={onSelect} className={({ isActive }) => cn(
      "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
      mobile
        ? isActive ? "bg-[#e5f5f1] font-semibold text-[#087f8c]" : "text-[#486581] hover:bg-[#f2f7fa] hover:text-[#102a43]"
        : isActive ? "bg-white/[0.12] font-semibold text-[#d9fff3]" : "text-[#b8cede] hover:bg-white/[0.06] hover:text-white",
    )}>
      <Icon aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={1.8} />
      <span className="flex-1">{item.label}</span>
      {queueCount > 0 && <span className="rounded-full bg-[#fbf1d8] px-2 py-0.5 text-xs font-bold text-[#855b13]">{queueCount}</span>}
    </NavLink>
  );
}
