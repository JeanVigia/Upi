export const ADMIN_LOGIN_RATE_LIMIT_MESSAGE =
  "Muitas tentativas de acesso. Aguarde alguns instantes e tente novamente.";

export type LoginRateLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

type FailureState = {
  failures: number;
  blockedUntil: number;
  lastFailureAt: number;
};

// The first typo is allowed through without a cooldown; subsequent failures
// progressively slow brute-force attempts down.
const BACKOFF_SECONDS = [0, 5, 15, 60, 300, 900];
const STATE_TTL_MS = 30 * 60 * 1000;

export class AdminLoginRateLimiter {
  private readonly states = new Map<string, FailureState>();

  check(key: string, now = Date.now()): LoginRateLimitDecision {
    const state = this.states.get(key);
    if (!state) return { allowed: true };

    if (now - state.lastFailureAt >= STATE_TTL_MS) {
      this.states.delete(key);
      return { allowed: true };
    }

    if (state.blockedUntil <= now) return { allowed: true };

    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((state.blockedUntil - now) / 1000)),
    };
  }

  recordFailure(key: string, now = Date.now()) {
    const previous = this.states.get(key);
    const failures = (previous?.failures ?? 0) + 1;
    const backoffSeconds = BACKOFF_SECONDS[Math.min(failures - 1, BACKOFF_SECONDS.length - 1)];
    this.states.set(key, {
      failures,
      blockedUntil: now + backoffSeconds * 1000,
      lastFailureAt: now,
    });
  }

  clear(key: string) {
    this.states.delete(key);
  }

  prune(now = Date.now()) {
    for (const [key, state] of Array.from(this.states.entries())) {
      if (now - state.lastFailureAt >= STATE_TTL_MS) this.states.delete(key);
    }
  }
}

export const adminLoginRateLimiter = new AdminLoginRateLimiter();

export function getAdminLoginKey(ip: string | undefined, username: string) {
  return `${ip || "unknown"}:${username.trim().toLowerCase()}`;
}
