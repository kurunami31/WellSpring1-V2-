import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { PERMISSIONS, type UserRole } from "@wellspring/shared";
import { api } from "@/lib/api";
import { DEMO_USERS } from "@/data/demo";
import {
  authenticateDemoAccount,
  createDemoAccount,
  getDemoAccountById,
  type DemoSignupInput,
} from "@/lib/demo-auth";
import type { DemoUser } from "@/types/prototype";

type Permission = keyof typeof PERMISSIONS;

interface AuthContextType {
  user: DemoUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: DemoSignupInput) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (...permissions: Permission[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SESSION_KEY = "wellspring-demo-session";
const USE_API = import.meta.env.VITE_USE_API === "true";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as DemoUser;
        const restored = DEMO_USERS.find((candidate) => candidate.id === parsed.id) ?? getDemoAccountById(parsed.id, localStorage);
        if (restored) setUser(restored);
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (USE_API) {
      const response = await api.login(email, password);
      const apiUser = response.user;
      const demoProfile = DEMO_USERS.find((candidate) => candidate.email === apiUser.email);
      const session = {
        id: apiUser.id,
        email: apiUser.email,
        name: apiUser.name,
        role: apiUser.role,
        branchId: apiUser.branchId,
        branchName: demoProfile?.branchName ?? "Assigned branch",
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setUser(session);
      return;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 350));
    const account = authenticateDemoAccount(email, password, localStorage);
    if (!account) {
      throw new Error("Email or password doesn't match a demo account. Try cashier1@wellspring.ph with password123.");
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(account));
    setUser(account);
  }, []);

  const signup = useCallback(async (input: DemoSignupInput) => {
    if (USE_API) throw new Error("Staff accounts are managed by an administrator when API authentication is enabled.");
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    const account = createDemoAccount(input, localStorage);
    localStorage.setItem(SESSION_KEY, JSON.stringify(account));
    setUser(account);
  }, []);

  const logout = useCallback(async () => {
    if (USE_API) {
      try { await api.logout(); } catch { /* Local sign-out still proceeds. */ }
    }
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!user) return false;
    if (user.role === "SYSTEM_ADMIN") return true;
    return (PERMISSIONS[permission] as readonly UserRole[]).includes(user.role);
  }, [user]);

  const hasAnyPermission = useCallback((...permissions: Permission[]): boolean => {
    return permissions.some((permission) => hasPermission(permission));
  }, [hasPermission]);

  const value = useMemo(() => ({ user, isLoading, login, signup, logout, hasPermission, hasAnyPermission }), [user, isLoading, login, signup, logout, hasPermission, hasAnyPermission]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
