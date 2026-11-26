import { describe, expect, it } from "vitest";
import { hasPermission, UserRole } from "@wellspring/shared";

describe("shared permissions", () => {
  it("allows a role listed for a permission", () => {
    expect(hasPermission(UserRole.CASHIER, "sales:create")).toBe(true);
  });

  it("denies a role omitted from a permission", () => {
    expect(hasPermission(UserRole.CASHIER, "admin:users")).toBe(false);
  });
});
