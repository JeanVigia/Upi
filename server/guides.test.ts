import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(user: AuthenticatedUser | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

const sampleUser: AuthenticatedUser = {
  id: 1,
  openId: "guide-test-user",
  email: "professor@example.com",
  name: "Professor Teste",
  loginMethod: "manus",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

describe("guides.list", () => {
  it("is available without authentication in demo mode", async () => {
    const caller = appRouter.createCaller(createContext(null));
    const result = await caller.guides.list();
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("returns the available official guides", async () => {
    const caller = appRouter.createCaller(createContext(sampleUser));
    const result = await caller.guides.list();

    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.every((guide) => guide.status === "active" || guide.id < 0)).toBe(true);
    expect(result.some((guide) => guide.title.length >= 4 && guide.content.length >= 20)).toBe(true);
  });
});
