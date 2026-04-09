import { existsSync } from "node:fs";
import { join } from "node:path";
import type { SteamUser } from "./types.ts";
import { listUserDirs, findVdfPath } from "./steam.ts";
import { readTextFile } from "../utils/fs.ts";

export async function discoverUsers(userDataDir: string): Promise<SteamUser[]> {
  const userDirs = listUserDirs(userDataDir);
  const users: SteamUser[] = [];

  for (const userId of userDirs) {
    // The "someId" is typically "760" for screenshots
    const someId = "760";
    const vdfPath = findVdfPath(userDataDir, userId);

    if (vdfPath) {
      const personalName = await resolveUserName(userDataDir, userId);
      users.push({ userId, someId, personalName, vdfPath });
    }
  }

  return users;
}

async function resolveUserName(userDataDir: string, userId: string): Promise<string> {
  // Try config.cfg first (SteaScree approach)
  const configCfgPath = join(userDataDir, userId, "config", "localconfig.vdf");

  if (existsSync(configCfgPath)) {
    try {
      const content = await readTextFile(configCfgPath);
      // Look for PersonaName in localconfig.vdf
      const match = content.match(/"PersonaName"\s+"([^"]+)"/);
      if (match?.[1]) return match[1];
    } catch {
      // Fall through
    }
  }

  // Try alternate config location
  const configPath = join(userDataDir, userId, "config.cfg");
  if (existsSync(configPath)) {
    try {
      const content = await readTextFile(configPath);
      const match = content.match(/^name\s+"([^"]+)"/m);
      if (match?.[1]) return match[1];
    } catch {
      // Fall through
    }
  }

  return `User ${userId}`;
}

export function formatUserDisplay(user: SteamUser): string {
  return `${user.userId} - ${user.personalName}`;
}
