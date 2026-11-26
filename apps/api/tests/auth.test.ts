import { describe, expect, it, vi } from "vitest";
import { UserRole } from "@wellspring/shared";

vi.mock("../src/index.js", () => ({ prisma: {} }));

import { generateToken, verifyToken } from "../src/middleware/auth.js";

const user = {
  id: "2cbf21a2-d398-4c73-9453-fb6f21788db5",
  email: "cashier@wellspring.ph",
  name: "Cashier One",
  role: UserRole.CASHIER,
  branchId: "21af70c2-e759-4450-a2ed-c3eb4343a573",
};

describe("JWT authentication", () => {
  it("round-trips the authenticated user identity", () => {
    const token = generateToken(user);

    expect(verifyToken(token)).toEqual(user);
  });

  it("rejects an invalid token", () => {
    expect(verifyToken(`${generateToken(user)}invalid`)).toBeNull();
  });
});
