import { describe, expect, test } from "vite-plus/test";
import { formatFileSize } from "../../src/utils/fs.ts";

describe("fs utils", () => {
  test("formatFileSize", () => {
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1024 * 1024 * 2.5)).toBe("2.5 MB");
  });
});
