import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { ENV } from "./env";
import { parse } from "cookie";
import { SignJWT, jwtVerify } from "jose";

export const TEST_ADMIN_COOKIE = "up-one-test-admin";

function testAdminKey() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function createTestAdminSession() {
  if (!ENV.cookieSecret) return null;
  return new SignJWT({ role: "admin", name: "Admin", email: "admin@test.local" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("test-admin")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(testAdminKey());
}

async function authenticateTestAdmin(req: CreateExpressContextOptions["req"]): Promise<User | null> {
  if (!ENV.cookieSecret) return null;
  const token = parse(req.headers.cookie ?? "")[TEST_ADMIN_COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, testAdminKey());
    if (payload.sub !== "test-admin" || payload.role !== "admin") return null;
    const now = new Date();
    return {
      id: -1,
      openId: "test-admin",
      name: "Admin",
      email: "admin@test.local",
      loginMethod: "test",
      role: "admin",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    };
  } catch {
    return null;
  }
}

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  if (!user) user = await authenticateTestAdmin(opts.req);

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
