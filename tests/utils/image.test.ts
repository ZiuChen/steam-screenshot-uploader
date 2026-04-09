import { describe, expect, test } from "vite-plus/test";
import { isImageTooLarge } from "../../src/utils/image.ts";

describe("image utils", () => {
  test("isImageTooLarge", () => {
    expect(isImageTooLarge(1920, 1080)).toBe(false);
    expect(isImageTooLarge(17000, 1000)).toBe(true);
    expect(isImageTooLarge(1000, 17000)).toBe(true);
    // 6000 * 5000 = 30_000_000 > STEAM_MAX_PIXELS
    expect(isImageTooLarge(6000, 5000)).toBe(true);
  });
});
