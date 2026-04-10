import { describe, expect, test } from "vite-plus/test";
import { detectSteamDir } from "@/core/steam.ts";

describe("steam detection", () => {
  test("detectSteamDir returns an object", () => {
    const result = detectSteamDir("/nonexistent/path");
    expect(result.steamDir).toBe("/nonexistent/path");
    expect(result.isValid).toBe(false);
  });
});
