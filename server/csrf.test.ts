import { describe, expect, it } from "vitest";
import { hasValidCsrfToken } from "./_core/context";

describe("administrative CSRF protection", () => {
  it("accepts a matching cookie and header token", () => {
    const token = "a".repeat(64);
    const req = { headers: { cookie: `upi-admin-csrf=${token}`, "x-csrf-token": token } } as never;
    expect(hasValidCsrfToken(req)).toBe(true);
  });

  it("rejects missing, mismatched and malformed tokens", () => {
    const token = "a".repeat(64);
    expect(hasValidCsrfToken({ headers: { cookie: `upi-admin-csrf=${token}` } } as never)).toBe(false);
    expect(hasValidCsrfToken({ headers: { cookie: `upi-admin-csrf=${token}`, "x-csrf-token": "b".repeat(64) } } as never)).toBe(false);
    expect(hasValidCsrfToken({ headers: { cookie: "upi-admin-csrf=short", "x-csrf-token": "short" } } as never)).toBe(false);
  });
});
