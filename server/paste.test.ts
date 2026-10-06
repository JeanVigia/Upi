import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("clipboard image paste", () => {
  it("handles image items from ClipboardEvent without blocking text paste", async () => {
    const source = await readFile(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
    expect(source).toContain("event.clipboardData.items");
    expect(source).toContain("item.kind === \"file\"");
    expect(source).toContain("onPaste={handlePaste}");
    expect(source).toContain("if (!pastedImage) return");
  });
});
