import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("Upi widget", () => {
  it("uses an isolated iframe and Shadow DOM host", async () => {
    const script = await readFile(resolve(process.cwd(), "client/public/widget.js"), "utf8");
    expect(script).toContain("attachShadow({ mode: \"closed\" })");
    expect(script).toContain('createElement("iframe")');
    expect(script).toContain("/widget");
    expect(script).toContain("up-one-close");
  });

  it("anchors the launcher on the right with a compact Upi icon", async () => {
    const script = await readFile(resolve(process.cwd(), "client/public/widget.js"), "utf8");
    expect(script).toContain("right: 20px");
    expect(script).toContain("width: 52px; height: 52px");
    expect(script).toContain("const iconUrl = `${widgetOrigin}/assets/upi/up-one-bot-transparent.png`");
    expect(script).toContain("background: #122b50 url(\"${iconUrl}\")");
  });
});
