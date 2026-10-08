import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type User = NonNullable<TrpcContext["user"]>;

function context(user: User | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

function loginContext() {
  const cookies: Array<{ name: string; value: string }> = [];
  const ctx = context(null);
  ctx.res.cookie = ((name: string, value: string) => { cookies.push({ name, value }); }) as typeof ctx.res.cookie;
  return { ctx, cookies };
}

const professor: User = {
  id: 2,
  openId: "professor-admin-test",
  email: "professor@example.com",
  name: "Professor",
  loginMethod: "local",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const admin: User = { ...professor, id: 3, openId: "admin-test", role: "admin", email: "admin@example.com" };
const testAdminPassword = process.env.LOCAL_ADMIN_PASSWORD ?? process.env.TEST_ADMIN_PASSWORD;

describe("admin guide procedures", () => {
  it("accepts only the temporary test credentials and issues a short-lived cookie", async () => {
    const invalid = loginContext();
    await expect(appRouter.createCaller(invalid.ctx).auth.localLogin({ username: "Admin", password: "wrong" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    expect(testAdminPassword).toBeTruthy();
    const valid = loginContext();
    await expect(appRouter.createCaller(valid.ctx).auth.localLogin({ username: "Admin", password: testAdminPassword! })).resolves.toEqual({ success: true });
    expect(valid.cookies[0]?.name).toBe("upi-local-admin");
  });

  it("rejects guide creation for unauthenticated and regular users", async () => {
    const input = { title: "Guia de teste administrativo", category: "Teste", content: "Conteúdo suficientemente longo para o teste administrativo." };
    await expect(appRouter.createCaller(context(null)).guides.create(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller(context(professor)).guides.create(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("exposes administrative list only to admin users", async () => {
    await expect(appRouter.createCaller(context(professor)).guides.adminList()).rejects.toMatchObject({ code: "FORBIDDEN" });
    const result = await appRouter.createCaller(context(admin)).guides.adminList();
    expect(Array.isArray(result)).toBe(true);
  });
});
