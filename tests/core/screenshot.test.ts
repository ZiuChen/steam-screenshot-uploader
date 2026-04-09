import { describe, expect, test } from "vite-plus/test";
import { generateFilename, isSupportedFormat } from "../../src/core/screenshot.ts";

describe("screenshot utils", () => {
  test("isSupportedFormat", () => {
    expect(isSupportedFormat("photo.jpg")).toBe(true);
    expect(isSupportedFormat("photo.JPEG")).toBe(true);
    expect(isSupportedFormat("photo.png")).toBe(true);
    expect(isSupportedFormat("photo.bmp")).toBe(true);
    expect(isSupportedFormat("photo.webp")).toBe(true);
    expect(isSupportedFormat("doc.pdf")).toBe(false);
    expect(isSupportedFormat("video.mp4")).toBe(false);
  });

  test("generateFilename with no collisions", () => {
    const timestamps = new Map<string, number>();
    const date = new Date("2024-01-15T10:30:00Z");
    const name = generateFilename(date, timestamps);
    expect(name).toMatch(/^\d{14}_1\.jpg$/);
  });

  test("generateFilename handles collisions", () => {
    const timestamps = new Map<string, number>();
    const date = new Date("2024-01-15T10:30:00Z");
    const name1 = generateFilename(date, timestamps);
    const name2 = generateFilename(date, timestamps);
    expect(name1).not.toBe(name2);
    expect(name1).toContain("_1.jpg");
    expect(name2).toContain("_2.jpg");
  });
});
