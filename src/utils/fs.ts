import { copyFile, readFile, writeFile, access, stat } from "node:fs/promises";
import { constants } from "node:fs";

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function backupFile(path: string): Promise<string> {
  const backupPath = `${path}.bak`;
  await copyFile(path, backupPath);
  return backupPath;
}

export async function readTextFile(path: string): Promise<string> {
  return readFile(path, "utf-8");
}

export async function writeTextFile(path: string, content: string): Promise<void> {
  await writeFile(path, content, "utf-8");
}

export async function getFileSize(path: string): Promise<number> {
  const s = await stat(path);
  return s.size;
}

export async function getFileModifiedTime(path: string): Promise<Date> {
  const s = await stat(path);
  return s.mtime;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
