import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readdir, readFile } from "node:fs/promises";
import type { SteamGame } from "@/core/types.ts";
import { readVdf } from "@/core/vdf.ts";

/**
 * Parse Steam's binary appinfo.vdf cache file to extract appid -> name mappings.
 * This covers all games the Steam client has ever fetched metadata for,
 * including games installed in other Steam libraries or CrossOver bottles.
 */
export async function parseAppInfoVdf(steamDir: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const appInfoPath = join(steamDir, "appcache", "appinfo.vdf");

  try {
    const buf = await readFile(appInfoPath);

    // Binary VDF format: look for string-type (0x01) + key-ID 4 (name field) + null-terminated value,
    // followed immediately by string-type + key-ID 5 (type field) as a reliable anchor.
    // Then look backward for int32-type (0x02) + key-ID 1 (appid field) + uint32 appid.
    const nameKey = Buffer.from([0x01, 0x04, 0x00, 0x00, 0x00]);
    const nameAnchor = Buffer.from([0x01, 0x05, 0x00, 0x00, 0x00]);
    const appidKey = Buffer.from([0x02, 0x01, 0x00, 0x00, 0x00]);

    let searchFrom = 0;
    while (true) {
      const namePos = buf.indexOf(nameKey, searchFrom);
      if (namePos === -1) break;

      const valueStart = namePos + nameKey.length;
      const valueEnd = buf.indexOf(0x00, valueStart);
      if (valueEnd === -1 || valueEnd - valueStart > 256) {
        searchFrom = namePos + 1;
        continue;
      }

      // Verify anchor (key-ID 5 immediately after the name string)
      if (!buf.subarray(valueEnd + 1, valueEnd + 1 + nameAnchor.length).equals(nameAnchor)) {
        searchFrom = namePos + 1;
        continue;
      }

      const name = buf.subarray(valueStart, valueEnd).toString("utf8");

      // Look backward up to 256 bytes for the appid field
      const lookback = buf.subarray(Math.max(0, namePos - 256), namePos);
      let appid: number | null = null;
      for (let i = lookback.length - appidKey.length; i >= 0; i--) {
        if (lookback.subarray(i, i + appidKey.length).equals(appidKey)) {
          appid = lookback.readUInt32LE(i + appidKey.length);
          break;
        }
      }

      if (appid !== null && appid > 0 && name.length > 0) {
        map.set(String(appid), name);
      }

      searchFrom = valueEnd + 1;
    }
  } catch {
    // appinfo.vdf not found or unreadable
  }

  return map;
}

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

  // Collect all steamapps directories: default + extra library folders
  const steamappsDirectories: string[] = [join(steamDir, "steamapps")];

  // Parse libraryfolders.vdf for additional library paths
  const libraryFoldersVdf = join(steamDir, "steamapps", "libraryfolders.vdf");
  try {
    const content = await readFile(libraryFoldersVdf, "utf-8");
    // Match "path" entries that look like valid Unix paths (skip Windows-style paths)
    const pathMatches = content.matchAll(/"path"\s+"([^"]+)"/g);
    for (const m of pathMatches) {
      const libPath = m[1]!;
      if (libPath.startsWith("/") && libPath !== steamDir) {
        steamappsDirectories.push(join(libPath, "steamapps"));
      }
    }
  } catch {
    // libraryfolders.vdf not found or unreadable
  }

  // Scan all steamapps directories for appmanifest_*.acf files
  await Promise.all(
    steamappsDirectories.map(async (dir) => {
      try {
        const entries = await readdir(dir);
        const manifests = entries.filter((f) => f.startsWith("appmanifest_") && f.endsWith(".acf"));
        await Promise.all(
          manifests.map(async (filename) => {
            try {
              const content = await readFile(join(dir, filename), "utf-8");
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
        // Directory not found or not readable
      }
    }),
  );

  return map;
}

export async function resolveGames(
  steamDir: string,
  userDataDir: string,
  userId: string,
  vdfPath: string,
): Promise<SteamGame[]> {
  const remoteGameIds = discoverUserGames(userDataDir, userId);
  const [apiGames, shortcuts, installedGames, cachedGames] = await Promise.all([
    fetchGameList(),
    parseShortcutNames(vdfPath),
    parseInstalledAppManifests(steamDir),
    parseAppInfoVdf(steamDir),
  ]);

  // Merge: installed games + remote dirs (deduplicated)
  // appinfo.vdf (cachedGames) is used for name lookup only, not as a game source
  const allIds = new Set([...installedGames.keys(), ...remoteGameIds]);

  return Array.from(allIds).map((appId) => {
    const installedName = installedGames.get(appId);
    const cachedName = cachedGames.get(appId);
    const apiName = apiGames.get(appId);
    const shortcutName = shortcuts.get(appId);
    const isShortcut = !installedName && !cachedName && !apiName && !!shortcutName;
    const name =
      installedName ?? cachedName ?? apiName ?? shortcutName ?? `Unknown Game (${appId})`;

    return { appId, name, isShortcut };
  });
}

export function formatGameDisplay(game: SteamGame): string {
  return `${game.appId} - ${game.name}`;
}
