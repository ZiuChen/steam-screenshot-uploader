export interface SteamInstallation {
  steamDir: string;
  userDataDir: string;
  isValid: boolean;
}

export interface SteamUser {
  userId: string;
  someId: string;
  personalName: string;
  vdfPath: string;
}

export interface SteamGame {
  appId: string;
  name: string;
  isShortcut: boolean;
}

export interface Screenshot {
  sourcePath: string;
  filename: string;
  width: number;
  height: number;
  creationTime: number;
  isLarge: boolean;
}

export interface ScreenshotVdfEntry {
  entryNumber: number;
  filename: string;
  thumbnailFilename: string;
  width: number;
  height: number;
  gameId: string;
  creationTime: number;
}

export interface UploadOptions {
  userId: string;
  someId: string;
  gameId: string;
  steamDir: string;
}

export interface VdfFile {
  path: string;
  lines: string[];
  lastModified: Date;
}

export interface FileEntry {
  name: string;
  path: string;
  size: number;
  isSupported: boolean;
  isSelected: boolean;
}

export const SUPPORTED_FORMATS = ["jpg", "jpeg", "png", "bmp", "tif", "tiff", "webp"] as const;

export const STEAM_MAX_SIDE = 16000;
export const STEAM_MAX_PIXELS = 26_210_175;
export const THUMBNAIL_WIDTH = 200;
