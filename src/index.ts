export { detectSteamDir, isSteamRunning } from "./core/steam.ts";
export { readVdf, writeVdf, findGameSection, appendScreenshotEntry } from "./core/vdf.ts";
export { discoverUsers } from "./core/user.ts";
export { resolveGames, fetchGameList } from "./core/game.ts";
export { prepareScreenshot, uploadScreenshots, isSupportedFormat } from "./core/screenshot.ts";
export type {
  SteamInstallation,
  SteamUser,
  SteamGame,
  Screenshot,
  UploadOptions,
  VdfFile,
} from "./core/types.ts";
