import { writeFile } from "node:fs/promises";
import { Jimp } from "jimp";
import { STEAM_MAX_SIDE, STEAM_MAX_PIXELS, THUMBNAIL_WIDTH } from "../core/types.ts";

export interface ImageMetadata {
  width: number;
  height: number;
  format: string | undefined;
}

export async function getImageMetadata(path: string): Promise<ImageMetadata> {
  const image = await Jimp.read(path);
  return { width: image.width, height: image.height, format: image.mime };
}

export async function validateImage(path: string): Promise<boolean> {
  try {
    const image = await Jimp.read(path);
    return image.width > 0 && image.height > 0;
  } catch {
    return false;
  }
}

export function isImageTooLarge(width: number, height: number): boolean {
  return width > STEAM_MAX_SIDE || height > STEAM_MAX_SIDE || width * height > STEAM_MAX_PIXELS;
}

export async function copyImageAsJpeg(sourcePath: string, destPath: string): Promise<void> {
  const image = await Jimp.read(sourcePath);
  const buf = await image.getBuffer("image/jpeg");
  await writeFile(destPath, buf);
}

export async function generateThumbnail(
  sourcePath: string,
  destPath: string,
  originalWidth: number,
  originalHeight: number,
): Promise<void> {
  const tnHeight = Math.floor((THUMBNAIL_WIDTH * originalHeight) / originalWidth);
  const image = await Jimp.read(sourcePath);
  image.resize({ w: THUMBNAIL_WIDTH, h: tnHeight });
  const buf = await image.getBuffer("image/jpeg");
  await writeFile(destPath, buf);
}
