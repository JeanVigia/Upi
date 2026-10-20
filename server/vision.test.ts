import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { isGoogleAiRateLimitError, MODEL_FALLBACK_ORDER, responseNeedsContinuation, selectChatModel } from "./routers";

describe("selectChatModel", () => {
  it("uses the stronger multimodal model when a print is attached", () => {
    expect(selectChatModel("data:image/png;base64,abc")).toBe(process.env.LLM_VISION_MODEL ?? "gemini-3.8-flash");
  });

  it("uses the fast model for text-only questions", () => {
    expect(selectChatModel()).toBe(process.env.LLM_TEXT_MODEL ?? "gemini-3.8-flash");
  });

  it("detects length-truncated model responses", () => {
    expect(responseNeedsContinuation("length")).toBe(true);
    expect(responseNeedsContinuation("stop")).toBe(false);
    expect(responseNeedsContinuation(null)).toBe(false);
  });

  it("detects Google AI Studio rate-limit responses without matching unrelated errors", () => {
    expect(isGoogleAiRateLimitError("429 Too Many Requests: RESOURCE_EXHAUSTED")).toBe(true);
    expect(isGoogleAiRateLimitError("503 Service Unavailable")).toBe(false);
  });

  it("keeps the requested model fallback order", () => {
    expect(MODEL_FALLBACK_ORDER).toEqual([
      "gemini-3.8-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.6-flash",
      "gemini-3.1-flash-lite",
      "gemini-3-flash-preview",
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash",
    ]);
  });

  it("instructs image analysis to ignore colors and prioritize shape and icon", async () => {
    const source = await readFile(resolve(process.cwd(), "server/routers.ts"), "utf8");
    expect(source).toContain("não use cores para identificar ou diferenciar");
    expect(source).toContain("formato e contorno");
    expect(source).toContain("desenho do ícone");
  });
});
