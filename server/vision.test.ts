import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { responseNeedsContinuation, selectChatModel } from "./routers";

describe("selectChatModel", () => {
  it("uses the stronger multimodal model when a print is attached", () => {
    expect(selectChatModel("data:image/png;base64,abc")).toBe("gemini-3.1-pro-preview");
  });

  it("uses the fast model for text-only questions", () => {
    expect(selectChatModel()).toBe("gemini-3-flash-preview");
  });

  it("detects length-truncated model responses", () => {
    expect(responseNeedsContinuation("length")).toBe(true);
    expect(responseNeedsContinuation("stop")).toBe(false);
    expect(responseNeedsContinuation(null)).toBe(false);
  });

  it("instructs image analysis to ignore colors and prioritize shape and icon", async () => {
    const source = await readFile(resolve(process.cwd(), "server/routers.ts"), "utf8");
    expect(source).toContain("não use cores para identificar ou diferenciar");
    expect(source).toContain("formato e contorno");
    expect(source).toContain("desenho do ícone");
  });
});
