import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";
import { parse } from "cookie";
import { SignJWT, jwtVerify } from "jose";

export const LOCAL_ADMIN_COOKIE = "upi-local-admin";

function sessionKey() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function createLocalAdminSession() {
  if (!ENV.cookieSecret || !ENV.localAdminPassword) return null;
  return new SignJWT({ role: "admin", name: ENV.localAdminUsername, email: "admin@local" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("local-admin")
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(sessionKey());
}

async function authenticateLocalAdmin(req: CreateExpressContextOptions["req"]): Promise<User | null> {
  if (!ENV.cookieSecret) return null;
  const token = parse(req.headers.cookie ?? "")[LOCAL_ADMIN_COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionKey(), { algorithms: ["HS256"] });
    if (payload.sub !== "local-admin" || payload.role !== "admin") return null;
    const now = new Date();
    return {
      id: -1,
      openId: "local-admin",
      name: ENV.localAdminUsername,
      email: "admin@local",
      loginMethod: "local",
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

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  return { req: opts.req, res: opts.res, user: await authenticateLocalAdmin(opts.req) };
}
