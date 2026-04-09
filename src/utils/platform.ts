import { platform, homedir } from "node:os";
import { join } from "node:path";

export type Platform = "darwin" | "linux" | "win32";

export function getPlatform(): Platform {
  const p = platform();
  if (p === "darwin" || p === "linux" || p === "win32") return p;
  throw new Error(`Unsupported platform: ${p}`);
}

export function getDefaultSteamDir(): string {
  const p = getPlatform();
  const home = homedir();

  switch (p) {
    case "darwin":
      return join(home, "Library", "Application Support", "Steam");
    case "linux":
      return join(home, ".steam", "steam");
    case "win32": {
      const programFiles = process.env["ProgramFiles(x86)"] ?? join("C:", "Program Files (x86)");
      return join(programFiles, "Steam");
    }
  }
}
