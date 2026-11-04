import type { NextFunction, Request, Response } from "express";

export const CHAT_RATE_LIMIT_MESSAGE =
  "O assistente está ocupado no momento. Aguarde um instante e tente novamente.";

export type ChatRateLimitOptions = {
  windowMs: number;
  maxRequests: number;
  maxConcurrentPerIp: number;
  maxConcurrentGlobal: number;
};

type Bucket = { windowStartedAt: number; requests: number; active: number };
type Decision =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number; reason: "window" | "concurrent-ip" | "concurrent-global" };
type DenialReason = "window" | "concurrent-ip" | "concurrent-global";

export class ChatRateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private activeGlobal = 0;

  constructor(private readonly options: ChatRateLimitOptions) {}

  check(key: string, now = Date.now()): Decision {
    this.removeExpired(now);
    let bucket = this.buckets.get(key);
    if (!bucket || now - bucket.windowStartedAt >= this.options.windowMs) {
      bucket = { windowStartedAt: now, requests: 0, active: 0 };
      this.buckets.set(key, bucket);
    }
    if (this.activeGlobal >= this.options.maxConcurrentGlobal) return this.denied(bucket, now, "concurrent-global");
    if (bucket.active >= this.options.maxConcurrentPerIp) return this.denied(bucket, now, "concurrent-ip");
    if (bucket.requests >= this.options.maxRequests) return this.denied(bucket, now, "window");
    bucket.requests += 1;
    bucket.active += 1;
    this.activeGlobal += 1;
    return { allowed: true };
  }

  release(key: string) {
    const bucket = this.buckets.get(key);
    if (!bucket) return;
    bucket.active = Math.max(0, bucket.active - 1);
    this.activeGlobal = Math.max(0, this.activeGlobal - 1);
  }

  getActiveGlobal() { return this.activeGlobal; }

  private denied(bucket: Bucket, now: number, reason: DenialReason): Decision {
    const remainingMs = Math.max(1, this.options.windowMs - (now - bucket.windowStartedAt));
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(remainingMs / 1000)), reason };
  }

  private removeExpired(now: number) {
    for (const [key, bucket] of Array.from(this.buckets.entries())) {
      if (bucket.active === 0 && now - bucket.windowStartedAt >= this.options.windowMs) this.buckets.delete(key);
    }
  }
}

const positiveInteger = (value: number, fallback: number) => Number.isInteger(value) && value > 0 ? value : fallback;

export function createChatRateLimit(options: Partial<ChatRateLimitOptions> = {}) {
  const config: ChatRateLimitOptions = {
    windowMs: positiveInteger(options.windowMs ?? 60_000, 60_000),
    maxRequests: positiveInteger(options.maxRequests ?? 10, 10),
    maxConcurrentPerIp: positiveInteger(options.maxConcurrentPerIp ?? 1, 1),
    maxConcurrentGlobal: positiveInteger(options.maxConcurrentGlobal ?? 4, 4),
  };
  const limiter = new ChatRateLimiter(config);

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const decision = limiter.check(key);
    res.setHeader("X-RateLimit-Limit", String(config.maxRequests));
    res.setHeader("X-RateLimit-Window", String(Math.ceil(config.windowMs / 1000)));
    if (!decision.allowed) {
      res.setHeader("Retry-After", String(decision.retryAfterSeconds));
      res.status(429).json({ error: { json: { message: CHAT_RATE_LIMIT_MESSAGE, code: "TOO_MANY_REQUESTS", data: { code: "TOO_MANY_REQUESTS", httpStatus: 429, path: "ai.chat" } } } });
      return;
    }
    let released = false;
    const release = () => { if (released) return; released = true; limiter.release(key); };
    res.once("finish", release);
    res.once("close", release);
    next();
  };
}
