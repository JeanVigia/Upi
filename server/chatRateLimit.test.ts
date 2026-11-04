import { describe, expect, it } from "vitest";
import { ChatRateLimiter } from "./chatRateLimit";

describe("ChatRateLimiter", () => {
  it("limits repeated requests from the same IP within the window", () => {
    const limiter = new ChatRateLimiter({ windowMs: 60_000, maxRequests: 2, maxConcurrentPerIp: 1, maxConcurrentGlobal: 4 });
    expect(limiter.check("203.0.113.10", 0)).toEqual({ allowed: true });
    limiter.release("203.0.113.10");
    expect(limiter.check("203.0.113.10", 1_000)).toEqual({ allowed: true });
    limiter.release("203.0.113.10");
    expect(limiter.check("203.0.113.10", 2_000)).toMatchObject({ allowed: false, reason: "window" });
    expect(limiter.check("203.0.113.11", 2_000)).toEqual({ allowed: true });
  });

  it("allows only one active request per IP by default", () => {
    const limiter = new ChatRateLimiter({ windowMs: 60_000, maxRequests: 10, maxConcurrentPerIp: 1, maxConcurrentGlobal: 4 });
    expect(limiter.check("203.0.113.10", 0)).toEqual({ allowed: true });
    expect(limiter.check("203.0.113.10", 1_000)).toMatchObject({ allowed: false, reason: "concurrent-ip" });
    limiter.release("203.0.113.10");
    expect(limiter.check("203.0.113.10", 1_000)).toEqual({ allowed: true });
  });

  it("protects the global Gemini concurrency budget", () => {
    const limiter = new ChatRateLimiter({ windowMs: 60_000, maxRequests: 10, maxConcurrentPerIp: 1, maxConcurrentGlobal: 2 });
    expect(limiter.check("203.0.113.10", 0)).toEqual({ allowed: true });
    expect(limiter.check("203.0.113.11", 0)).toEqual({ allowed: true });
    expect(limiter.getActiveGlobal()).toBe(2);
    expect(limiter.check("203.0.113.12", 0)).toMatchObject({ allowed: false, reason: "concurrent-global" });
  });

  it("starts a new window after the configured period", () => {
    const limiter = new ChatRateLimiter({ windowMs: 60_000, maxRequests: 1, maxConcurrentPerIp: 1, maxConcurrentGlobal: 4 });
    expect(limiter.check("203.0.113.10", 0)).toEqual({ allowed: true });
    limiter.release("203.0.113.10");
    expect(limiter.check("203.0.113.10", 60_000)).toEqual({ allowed: true });
  });
});
