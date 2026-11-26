import { UserRole } from "@wellspring/shared";
import { DEMO_PASSWORD, DEMO_USERS, MAIN_BRANCH_ID } from "@/data/demo";
import type { DemoUser } from "@/types/prototype";

export const DEMO_ACCOUNTS_KEY = "wellspring-demo-accounts-v1";

export interface DemoSignupInput {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface StoredDemoAccount {
  user: DemoUser;
  password: string;
}

type DemoStorage = Pick<Storage, "getItem" | "setItem">;

function isStoredAccount(value: unknown): value is StoredDemoAccount {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredDemoAccount>;
  const user = candidate.user;
  return typeof candidate.password === "string"
    && !!user
    && typeof user.id === "string"
    && typeof user.email === "string"
    && typeof user.name === "string"
    && user.role === UserRole.CASHIER
    && typeof user.branchName === "string";
}

function readAccounts(storage: DemoStorage): StoredDemoAccount[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(DEMO_ACCOUNTS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isStoredAccount) : [];
  } catch {
    return [];
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createDemoAccount(
  input: DemoSignupInput,
  storage: DemoStorage,
  id = `local-${globalThis.crypto.randomUUID()}`,
): DemoUser {
  const name = input.name.trim().replace(/\s+/g, " ");
  const email = normalizeEmail(input.email);
  if (!name) throw new Error("Enter your full name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  if (input.password.length < 8) throw new Error("Use a password with at least 8 characters.");
  if (input.password !== input.confirmPassword) throw new Error("Make sure the passwords match.");

  const accounts = readAccounts(storage);
  const duplicate = DEMO_USERS.some((account) => normalizeEmail(account.email) === email)
    || accounts.some((account) => normalizeEmail(account.user.email) === email);
  if (duplicate) throw new Error("An account with this email already exists.");

  // Demo-only persistence. Never use browser storage for real staff credentials.
  const user: DemoUser = {
    id,
    email,
    name,
    role: UserRole.CASHIER,
    branchId: MAIN_BRANCH_ID,
    branchName: "WS01 · Davao Main",
  };
  accounts.push({ user, password: input.password });
  storage.setItem(DEMO_ACCOUNTS_KEY, JSON.stringify(accounts));
  return user;
}

export function getDemoAccountById(id: string, storage: DemoStorage): DemoUser | null {
  return readAccounts(storage).find((account) => account.user.id === id)?.user ?? null;
}

export function authenticateDemoAccount(email: string, password: string, storage: DemoStorage): DemoUser | null {
  const normalizedEmail = normalizeEmail(email);
  const seeded = DEMO_USERS.find((account) => normalizeEmail(account.email) === normalizedEmail);
  if (seeded) return password === DEMO_PASSWORD ? seeded : null;
  const local = readAccounts(storage).find((account) => normalizeEmail(account.user.email) === normalizedEmail);
  return local?.password === password ? local.user : null;
}
