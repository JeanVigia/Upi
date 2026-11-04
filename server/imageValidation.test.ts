import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, validateImageDataUrl } from "./routers";

const png = (bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])) =>
  `data:image/png;base64,${bytes.toString("base64")}`;

describe("validateImageDataUrl", () => {
  it("accepts a valid PNG data URL", () => {
    expect(validateImageDataUrl(png())).toBeNull();
  });

  it("accepts valid JPEG and WebP signatures", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const webp = Buffer.from("RIFFxxxxWEBP", "ascii");
    expect(validateImageDataUrl(`data:image/jpeg;base64,${jpeg.toString("base64")}`)).toBeNull();
    expect(validateImageDataUrl(`data:image/webp;base64,${webp.toString("base64")}`)).toBeNull();
  });

  it("rejects unsupported MIME types and malformed data URLs", () => {
    expect(validateImageDataUrl("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yw=")).toContain("PNG, JPEG ou WebP");
    expect(validateImageDataUrl("data:image/png;base64,not-valid?"))?.toContain("PNG, JPEG ou WebP");
  });

  it("rejects a MIME/signature mismatch", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    expect(validateImageDataUrl(`data:image/png;base64,${jpeg.toString("base64")}`)).toContain("não corresponde");
  });

  it("rejects images larger than the decoded byte limit", () => {
    const oversized = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(MAX_IMAGE_BYTES),
    ]);
    expect(validateImageDataUrl(png(oversized))).toContain("6 MB");
  });
});
