import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { SteamInstallation } from "./types.ts";
import { getDefaultSteamDir, getPlatform } from "../utils/platform.ts";

const execAsync = promisify(exec);

export function detectSteamDir(customDir?: string): SteamInstallation {
  const steamDir = customDir ?? getDefaultSteamDir();
  const userDataDir = join(steamDir, "userdata");
  const isValid = existsSync(userDataDir);

  return { steamDir, userDataDir, isValid };
}

export async function isSteamRunning(): Promise<boolean> {
  const p = getPlatform();

  try {
    switch (p) {
      case "darwin": {
        const { stdout } = await execAsync("pgrep -x steam_osx || pgrep -ix Steam");
        return stdout.trim().length > 0;
      }
      case "linux": {
        const { stdout } = await execAsync("pgrep -x steam");
        return stdout.trim().length > 0;
      }
      case "win32": {
        const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq steam.exe" /NH');
        return stdout.toLowerCase().includes("steam.exe");
      }
    }
  } catch {
    // pgrep returns exit code 1 when no process found
    return false;
  }
}

export function listUserDirs(userDataDir: string): string[] {
  if (!existsSync(userDataDir)) return [];

  return readdirSync(userDataDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d+$/.test(d.name))
    .map((d) => d.name);
}

export function findVdfPath(userDataDir: string, userId: string): string | null {
  // The VDF file is at <userdata>/<userId>/760/remote/screenshots.vdf
  const vdfPath = join(userDataDir, userId, "760", "remote", "screenshots.vdf");
  return existsSync(vdfPath) ? vdfPath : null;
}

export function getScreenshotsDir(userDataDir: string, userId: string, gameId: string): string {
  return join(userDataDir, userId, "760", "remote", gameId, "screenshots");
}

export function getThumbnailsDir(userDataDir: string, userId: string, gameId: string): string {
  return join(userDataDir, userId, "760", "remote", gameId, "screenshots", "thumbnails");
}
