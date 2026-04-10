import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readdir, readFile } from "node:fs/promises";
import type { SteamGame } from "./types.ts";
import { readVdf } from "./vdf.ts";

let cachedGameList: Map<string, string> | null = null;

export async function fetchGameList(): Promise<Map<string, string>> {
  if (cachedGameList) return cachedGameList;

  try {
    const response = await fetch("https://api.steampowered.com/ISteamApps/GetAppList/v2");
    const data = (await response.json()) as {
      applist: { apps: Array<{ appid: number; name: string }> };
    };

    const map = new Map<string, string>();
    for (const app of data.applist.apps) {
      if (app.name) {
        map.set(String(app.appid), app.name);
      }
    }

    cachedGameList = map;
    return map;
  } catch {
    return new Map();
  }
}

export function discoverUserGames(userDataDir: string, userId: string): string[] {
  const remoteDir = join(userDataDir, userId, "760", "remote");
  if (!existsSync(remoteDir)) return [];

  return readdirSync(remoteDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d+$/.test(d.name))
    .map((d) => d.name);
}

export async function parseShortcutNames(vdfPath: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  try {
    const vdf = await readVdf(vdfPath);
    let inShortcutNames = false;
    let depth = 0;

    for (const line of vdf.lines) {
      const trimmed = line.trim();

      if (trimmed === '"shortcutnames"') {
        inShortcutNames = true;
        continue;
      }

      if (inShortcutNames) {
        if (trimmed === "{") {
          depth++;
          continue;
        }
        if (trimmed === "}") {
          depth--;
          if (depth <= 0) break;
          continue;
        }

        // Match entries like: "<id>"    "<name>"
        const match = trimmed.match(/^"(\d+)"\s+"(.+)"$/);
        if (match?.[1] && match[2]) {
          map.set(match[1], match[2]);
        }
      }
    }
  } catch {
    // Ignore errors
  }

  return map;
}

export async function parseInstalledAppManifests(steamDir: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const steamappsDir = join(steamDir, "steamapps");

  try {
    const entries = await readdir(steamappsDir);
    const manifests = entries.filter((f) => f.startsWith("appmanifest_") && f.endsWith(".acf"));

    await Promise.all(
      manifests.map(async (filename) => {
        try {
          const content = await readFile(join(steamappsDir, filename), "utf-8");
          const appidMatch = content.match(/"appid"\s+"(\d+)"/);
          const nameMatch = content.match(/"name"\s+"([^"]+)"/);
          if (appidMatch?.[1] && nameMatch?.[1]) {
            map.set(appidMatch[1], nameMatch[1]);
          }
        } catch {
          // Ignore individual file errors
        }
      }),
    );
  } catch {
    // steamapps dir not found or not readable
  }

  return map;
}

export async function resolveGames(
  steamDir: string,
  userDataDir: string,
  userId: string,
  vdfPath: string,
): Promise<SteamGame[]> {
  const remoteGameIds = discoverUserGames(userDataDir, userId);
  const [apiGames, shortcuts, installedGames] = await Promise.all([
    fetchGameList(),
    parseShortcutNames(vdfPath),
    parseInstalledAppManifests(steamDir),
  ]);

  // Merge: installed games + remote dirs (deduplicated)
  const allIds = new Set([...installedGames.keys(), ...remoteGameIds]);

  return Array.from(allIds).map((appId) => {
    const installedName = installedGames.get(appId);
    const apiName = apiGames.get(appId);
    const shortcutName = shortcuts.get(appId);
    const isShortcut = !installedName && !apiName && !!shortcutName;
    const name = installedName ?? apiName ?? shortcutName ?? `Unknown Game (${appId})`;

    return { appId, name, isShortcut };
  });
}

export function formatGameDisplay(game: SteamGame): string {
  return `${game.appId} - ${game.name}`;
}
