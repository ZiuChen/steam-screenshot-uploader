import { mkdir } from "node:fs/promises";
import { join, extname } from "node:path";
import type { Screenshot, UploadOptions, ScreenshotVdfEntry } from "./types.ts";
import { SUPPORTED_FORMATS, STEAM_MAX_SIDE, STEAM_MAX_PIXELS } from "./types.ts";
import { getScreenshotsDir, getThumbnailsDir } from "./steam.ts";
import {
  readVdf,
  writeVdf,
  appendScreenshotEntry,
  getLastEntryNumber,
  hasScreenshotEntry,
} from "./vdf.ts";
import {
  getImageMetadata,
  validateImage,
  isImageTooLarge,
  copyImageAsJpeg,
  generateThumbnail,
} from "../utils/image.ts";
import { getFileModifiedTime, fileExists } from "../utils/fs.ts";

export function isSupportedFormat(filename: string): boolean {
  const ext = extname(filename).toLowerCase().slice(1);
  return (SUPPORTED_FORMATS as readonly string[]).includes(ext);
}

export function generateFilename(
  modifiedTime: Date,
  existingTimestamps: Map<string, number>,
): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = modifiedTime;
  const timestamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

  const count = existingTimestamps.get(timestamp) ?? 0;
  const increment = count + 1;
  existingTimestamps.set(timestamp, increment);

  return `${timestamp}_${increment}.jpg`;
}

export async function prepareScreenshot(sourcePath: string): Promise<Screenshot | null> {
  const isValid = await validateImage(sourcePath);
  if (!isValid) return null;

  const metadata = await getImageMetadata(sourcePath);
  const modifiedTime = await getFileModifiedTime(sourcePath);
  const large = isImageTooLarge(metadata.width, metadata.height);

  return {
    sourcePath,
    filename: "", // Will be set during batch processing
    width: metadata.width,
    height: metadata.height,
    creationTime: Math.floor(modifiedTime.getTime() / 1000),
    isLarge: large,
  };
}

export interface UploadProgress {
  current: number;
  total: number;
  filename: string;
  status: "processing" | "done" | "skipped" | "error";
  error?: string;
}

export async function uploadScreenshots(
  screenshots: Screenshot[],
  options: UploadOptions,
  onProgress?: (progress: UploadProgress) => void,
): Promise<{ success: number; failed: number; skipped: number }> {
  const screenshotsDir = getScreenshotsDir(
    options.steamDir + "/userdata",
    options.userId,
    options.gameId,
  );
  const thumbnailsDir = getThumbnailsDir(
    options.steamDir + "/userdata",
    options.userId,
    options.gameId,
  );

  // Ensure directories exist
  await mkdir(screenshotsDir, { recursive: true });
  await mkdir(thumbnailsDir, { recursive: true });

  // Read VDF
  const vdfPath = join(
    options.steamDir,
    "userdata",
    options.userId,
    "760",
    "remote",
    "screenshots.vdf",
  );

  if (!(await fileExists(vdfPath))) {
    throw new Error(`VDF file not found: ${vdfPath}`);
  }

  const vdf = await readVdf(vdfPath);

  // Assign filenames
  const existingTimestamps = new Map<string, number>();
  for (const screenshot of screenshots) {
    const modifiedTime = new Date(screenshot.creationTime * 1000);
    screenshot.filename = generateFilename(modifiedTime, existingTimestamps);
  }

  let success = 0;
  let failed = 0;
  let skipped = 0;
  let entryNumber = getLastEntryNumber(vdf.lines, options.gameId);

  for (let i = 0; i < screenshots.length; i++) {
    const screenshot = screenshots[i]!;
    const destPath = join(screenshotsDir, screenshot.filename);
    const thumbPath = join(thumbnailsDir, screenshot.filename);

    onProgress?.({
      current: i + 1,
      total: screenshots.length,
      filename: screenshot.filename,
      status: "processing",
    });

    // Check for duplicates
    if (hasScreenshotEntry(vdf.lines, options.gameId, screenshot.filename)) {
      skipped++;
      onProgress?.({
        current: i + 1,
        total: screenshots.length,
        filename: screenshot.filename,
        status: "skipped",
      });
      continue;
    }

    try {
      // Reject images that exceed Steam's limits
      if (screenshot.isLarge) {
        failed++;
        onProgress?.({
          current: i + 1,
          total: screenshots.length,
          filename: screenshot.filename,
          status: "error",
          error: `Image too large (${screenshot.width}x${screenshot.height}). Steam limit: ${STEAM_MAX_SIDE}px per side, ${STEAM_MAX_PIXELS} total pixels.`,
        });
        continue;
      }

      // Copy image as JPEG
      await copyImageAsJpeg(screenshot.sourcePath, destPath);

      // Generate thumbnail
      await generateThumbnail(
        screenshot.sourcePath,
        thumbPath,
        screenshot.width,
        screenshot.height,
      );

      // Add VDF entry
      entryNumber++;
      const entry: ScreenshotVdfEntry = {
        entryNumber,
        filename: screenshot.filename,
        thumbnailFilename: screenshot.filename,
        width: screenshot.width,
        height: screenshot.height,
        gameId: options.gameId,
        creationTime: screenshot.creationTime,
      };
      appendScreenshotEntry(vdf.lines, options.gameId, entry);

      success++;
      onProgress?.({
        current: i + 1,
        total: screenshots.length,
        filename: screenshot.filename,
        status: "done",
      });
    } catch (err) {
      failed++;
      onProgress?.({
        current: i + 1,
        total: screenshots.length,
        filename: screenshot.filename,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Write VDF with all entries
  if (success > 0) {
    await writeVdf(vdf);
  }

  return { success, failed, skipped };
}
