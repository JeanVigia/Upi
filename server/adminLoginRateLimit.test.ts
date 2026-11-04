import { describe, expect, it } from "vitest";
import { AdminLoginRateLimiter, getAdminLoginKey } from "./adminLoginRateLimit";

describe("AdminLoginRateLimiter", () => {
  it("increases the cooldown after each failed attempt", () => {
    const limiter = new AdminLoginRateLimiter();
    const key = getAdminLoginKey("203.0.113.10", "Admin");

    limiter.recordFailure(key, 0);
    expect(limiter.check(key, 1_000)).toEqual({ allowed: true });

    limiter.recordFailure(key, 1_000);
    expect(limiter.check(key, 2_000)).toMatchObject({ allowed: false, retryAfterSeconds: 4 });
    limiter.recordFailure(key, 6_000);
    expect(limiter.check(key, 7_000)).toMatchObject({ allowed: false, retryAfterSeconds: 14 });
  });

  it("clears the accumulated failures after a successful login", () => {
    const limiter = new AdminLoginRateLimiter();
    const key = getAdminLoginKey("203.0.113.10", "Admin");
    limiter.recordFailure(key, 0);
    limiter.clear(key);
    expect(limiter.check(key, 1_000)).toEqual({ allowed: true });
  });

  it("expires stale failure state", () => {
    const limiter = new AdminLoginRateLimiter();
    const key = getAdminLoginKey("203.0.113.10", "Admin");
    limiter.recordFailure(key, 0);
    expect(limiter.check(key, 30 * 60 * 1000)).toEqual({ allowed: true });
  });

  it("separates usernames and IP addresses", () => {
    expect(getAdminLoginKey("203.0.113.10", "Admin")).not.toBe(getAdminLoginKey("203.0.113.11", "Admin"));
    expect(getAdminLoginKey("203.0.113.10", "Admin")).not.toBe(getAdminLoginKey("203.0.113.10", "other"));
  });
});
