import type { ReactNode } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PERMISSIONS } from "@wellspring/shared";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { PrototypeProvider } from "@/context/PrototypeContext";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import POSPage from "@/pages/POSPage";
import InventoryPage from "@/pages/InventoryPage";
import PurchasingPage from "@/pages/PurchasingPage";
import SuppliersPage from "@/pages/SuppliersPage";
import ReturnsPage from "@/pages/ReturnsPage";
import ReportsPage from "@/pages/ReportsPage";
import AdminPage from "@/pages/AdminPage";
import OfflinePage from "@/pages/OfflinePage";

type Permission = keyof typeof PERMISSIONS;

function ProtectedShell() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <div className="flex min-h-screen items-center justify-center" role="status">Loading WellSpring One…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <PrototypeProvider><AppShell /></PrototypeProvider>;
}

function PermissionRoute({ permissions, children }: { permissions: Permission[]; children: ReactNode }) {
  const { hasAnyPermission } = useAuth();
  if (permissions.length > 0 && !hasAnyPermission(...permissions)) return <AccessDenied />;
  return children;
}

function AccessDenied() {
  const { user } = useAuth();
  return (
    <section className="mx-auto max-w-xl border-l-4 border-[#855b13] bg-white p-6 sm:p-8">
      <p className="eyebrow">Role-based access</p>
      <h1 className="page-title mt-2">This page isn't in your role.</h1>
      <p className="mt-4 text-sm leading-6 text-[#486581]">Your {user?.role.replaceAll("_", " ").toLowerCase()} account can still use the pages shown in the navigation. Ask a system administrator if your duties have changed.</p>
      <Button asChild className="mt-6"><Link to="/dashboard"><ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />Return to dashboard</Link></Button>
    </section>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/pos" element={<PermissionRoute permissions={["sales:create", "sales:read"]}><POSPage /></PermissionRoute>} />
          <Route path="/inventory" element={<PermissionRoute permissions={["inventory:read", "inventory:batch_manage"]}><InventoryPage /></PermissionRoute>} />
          <Route path="/purchasing" element={<PermissionRoute permissions={["purchasing:read", "purchasing:grn"]}><PurchasingPage /></PermissionRoute>} />
          <Route path="/suppliers" element={<PermissionRoute permissions={["purchasing:read", "supplier:manage"]}><SuppliersPage /></PermissionRoute>} />
          <Route path="/returns" element={<PermissionRoute permissions={["sales:read"]}><ReturnsPage /></PermissionRoute>} />
          <Route path="/reports" element={<PermissionRoute permissions={["reports:branch_sales", "reports:inventory", "reports:consolidated"]}><ReportsPage /></PermissionRoute>} />
          <Route path="/offline" element={<OfflinePage />} />
          <Route path="/admin" element={<PermissionRoute permissions={["admin:users", "admin:audit"]}><AdminPage /></PermissionRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
