import { describe, expect, it } from "vitest";
import { assertUniqueNames, inspectImage, normalizeManifestPath, validateSegment } from "./policy.js";

describe("content policy", () => {
  it("accepts safe categories and slugs", () => {
    expect(validateSegment("技术", "category")).toBe("技术");
    expect(validateSegment("oauth-security", "slug")).toBe("oauth-security");
  });

  it("rejects traversal and ambiguous names", () => {
    expect(() => validateSegment("../secret", "category")).toThrow();
    expect(() => validateSegment("Bad Slug", "slug")).toThrow();
    expect(() => normalizeManifestPath("post/nested/image.png", "post")).toThrow();
    expect(() => normalizeManifestPath("post\\image.png", "post")).toThrow();
    expect(() => normalizeManifestPath("C:/post/index.md", "post")).toThrow();
    expect(() => assertUniqueNames(["A.png", "a.png"])).toThrow();
  });

  it("reads lossy WebP and AVIF dimensions", () => {
    const webp = Buffer.alloc(30);
    webp.write("RIFF", 0, "ascii");
    webp.write("WEBP", 8, "ascii");
    webp.write("VP8 ", 12, "ascii");
    Buffer.from([0x9d, 0x01, 0x2a]).copy(webp, 23);
    webp.writeUInt16LE(320, 26);
    webp.writeUInt16LE(180, 28);
    expect(inspectImage(webp, "cover.webp")).toEqual({ width: 320, height: 180 });

    const avif = Buffer.alloc(40);
    avif.write("ftyp", 4, "ascii");
    avif.write("avif", 8, "ascii");
    avif.write("ispe", 20, "ascii");
    avif.writeUInt32BE(640, 28);
    avif.writeUInt32BE(360, 32);
    expect(inspectImage(avif, "cover.avif")).toEqual({ width: 640, height: 360 });
  });

  it("checks PNG magic and dimensions", () => {
    const png = Buffer.alloc(24);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
    png.writeUInt32BE(20, 16);
    png.writeUInt32BE(10, 20);
    expect(inspectImage(png, "cover.png")).toEqual({ width: 20, height: 10 });
    expect(() => inspectImage(png, "cover.jpg")).toThrow();
  });
});
