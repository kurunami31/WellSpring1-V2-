import { UserRole } from "@wellspring/shared";
import { describe, expect, it } from "vitest";
import { DEMO_PASSWORD, MAIN_BRANCH_ID } from "@/data/demo";
import {
  authenticateDemoAccount,
  createDemoAccount,
  getDemoAccountById,
  type DemoSignupInput,
} from "./demo-auth";

type TestStorage = Pick<Storage, "getItem" | "setItem">;

function createStorage(): TestStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
  };
}

const validSignup: DemoSignupInput = {
  name: "  Juan Dela Cruz  ",
  email: "  JUAN@EXAMPLE.COM ",
  password: "password123",
  confirmPassword: "password123",
};

describe("createDemoAccount", () => {
  it("creates a normalized WS01 cashier account that persists for session restoration", () => {
    const storage = createStorage();

    const account = createDemoAccount(validSignup, storage, "local-juan");

    expect(account).toEqual({
      id: "local-juan",
      email: "juan@example.com",
      name: "Juan Dela Cruz",
      role: UserRole.CASHIER,
      branchId: MAIN_BRANCH_ID,
      branchName: "WS01 · Davao Main",
    });
    expect(getDemoAccountById("local-juan", storage)).toEqual(account);
  });

  it.each([
    { override: { name: " " }, message: /full name/i },
    { override: { email: "not-an-email" }, message: /valid email/i },
    { override: { password: "short", confirmPassword: "short" }, message: /at least 8 characters/i },
    { override: { confirmPassword: "different123" }, message: /passwords match/i },
  ])("rejects invalid signup details", ({ override, message }) => {
    expect(() => createDemoAccount({ ...validSignup, ...override }, createStorage())).toThrow(message);
  });

  it("rejects emails belonging to seeded or previously created accounts", () => {
    const storage = createStorage();
    createDemoAccount(validSignup, storage);

    expect(() => createDemoAccount(validSignup, storage)).toThrow(/already exists/i);
    expect(() => createDemoAccount({ ...validSignup, email: "ADMIN@WELLSPRING.PH" }, storage)).toThrow(/already exists/i);
  });
});

describe("authenticateDemoAccount", () => {
  it("signs in a created account later with a case-insensitive email", () => {
    const storage = createStorage();
    const account = createDemoAccount(validSignup, storage);

    expect(authenticateDemoAccount("JUAN@example.com", "password123", storage)).toEqual(account);
    expect(authenticateDemoAccount("juan@example.com", "wrong-password", storage)).toBeNull();
  });

  it("keeps seeded demo accounts available with their shared demo password", () => {
    const account = authenticateDemoAccount("ADMIN@wellspring.ph", DEMO_PASSWORD, createStorage());

    expect(account).toMatchObject({ id: "u-admin", role: UserRole.SYSTEM_ADMIN });
    expect(authenticateDemoAccount("admin@wellspring.ph", "wrong-password", createStorage())).toBeNull();
  });

  it("ignores malformed locally stored account data", () => {
    const storage = createStorage();
    storage.setItem("wellspring-demo-accounts-v1", "not-json");

    expect(getDemoAccountById("local-juan", storage)).toBeNull();
    expect(authenticateDemoAccount("juan@example.com", "password123", storage)).toBeNull();
  });
});
