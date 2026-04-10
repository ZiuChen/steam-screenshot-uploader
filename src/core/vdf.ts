import type { VdfFile, ScreenshotVdfEntry } from "@/core/types.ts";
import { readTextFile, writeTextFile, backupFile } from "@/utils/fs.ts";
import { stat } from "node:fs/promises";

export async function readVdf(path: string): Promise<VdfFile> {
  const content = await readTextFile(path);
  const lines = content.split("\n");
  const s = await stat(path);

  return { path, lines, lastModified: s.mtime };
}

export async function writeVdf(vdf: VdfFile): Promise<void> {
  await backupFile(vdf.path);
  await writeTextFile(vdf.path, vdf.lines.join("\n"));
}

export function findGameSection(
  lines: string[],
  gameId: string,
): { start: number; end: number } | null {
  const headerPattern = new RegExp(`^\\t"${gameId}"$`);

  for (let i = 0; i < lines.length; i++) {
    if (headerPattern.test(lines[i]!)) {
      // Next line should be opening brace
      if (i + 1 < lines.length && lines[i + 1]!.trim() === "{") {
        // Find matching closing brace
        let depth = 1;
        for (let j = i + 2; j < lines.length; j++) {
          const trimmed = lines[j]!.trim();
          if (trimmed === "{") depth++;
          if (trimmed === "}") depth--;
          if (depth === 0) {
            return { start: i, end: j };
          }
        }
      }
    }
  }
  return null;
}

export function insertGameSection(lines: string[], gameId: string): number {
  // Find the correct position to insert (maintain ascending order by game ID)
  // Game sections are at the top level (one tab indent)
  const headerPattern = /^\t"(\d+)"$/;
  let insertIndex = -1;
  const numericGameId = Number.parseInt(gameId, 10);

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i]!.match(headerPattern);
    if (match) {
      const existingId = Number.parseInt(match[1]!, 10);
      if (existingId > numericGameId) {
        insertIndex = i;
        break;
      }
    }
  }

  // If no position found, insert before "shortcutnames" section or at end
  if (insertIndex === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]!.trim() === '"shortcutnames"') {
        insertIndex = i;
        break;
      }
    }
  }

  if (insertIndex === -1) {
    // Insert before closing brace of root
    insertIndex = lines.length - 1;
  }

  const newLines = [`\t"${gameId}"`, "\t{", "\t}"];
  lines.splice(insertIndex, 0, ...newLines);

  return insertIndex;
}

export function appendScreenshotEntry(
  lines: string[],
  gameId: string,
  entry: ScreenshotVdfEntry,
): void {
  let section = findGameSection(lines, gameId);
  if (!section) {
    insertGameSection(lines, gameId);
    section = findGameSection(lines, gameId);
    if (!section) {
      throw new Error(`Failed to create game section for ${gameId}`);
    }
  }

  const entryLines = buildVdfEntryLines(entry);
  // Insert before the closing brace of the section
  lines.splice(section.end, 0, ...entryLines);
}

export function getLastEntryNumber(lines: string[], gameId: string): number {
  const section = findGameSection(lines, gameId);
  if (!section) return 0;

  let maxEntry = 0;
  const entryPattern = /^\t\t"(\d+)"$/;

  for (let i = section.start; i <= section.end; i++) {
    const match = lines[i]!.match(entryPattern);
    if (match) {
      const num = Number.parseInt(match[1]!, 10);
      if (num > maxEntry) maxEntry = num;
    }
  }

  return maxEntry;
}

function buildVdfEntryLines(entry: ScreenshotVdfEntry): string[] {
  return [
    `\t\t"${entry.entryNumber}"`,
    "\t\t{",
    '\t\t\t"type"\t\t"1"',
    `\t\t\t"filename"\t\t"${entry.gameId}/screenshots/${entry.filename}"`,
    `\t\t\t"thumbnail"\t\t"${entry.gameId}/screenshots/thumbnails/${entry.thumbnailFilename}"`,
    '\t\t\t"vrfilename"\t\t""',
    '\t\t\t"imported"\t\t"0"',
    `\t\t\t"width"\t\t"${entry.width}"`,
    `\t\t\t"height"\t\t"${entry.height}"`,
    `\t\t\t"gameid"\t\t"${entry.gameId}"`,
    `\t\t\t"creation"\t\t"${entry.creationTime}"`,
    '\t\t\t"caption"\t\t""',
    '\t\t\t"Permissions"\t\t""',
    '\t\t\t"hscreenshot"\t\t""',
    "\t\t}",
  ];
}

export function hasScreenshotEntry(lines: string[], gameId: string, filename: string): boolean {
  const section = findGameSection(lines, gameId);
  if (!section) return false;

  const target = `"filename"\t\t"${gameId}/screenshots/${filename}"`;
  for (let i = section.start; i <= section.end; i++) {
    if (lines[i]!.includes(target)) return true;
  }
  return false;
}
