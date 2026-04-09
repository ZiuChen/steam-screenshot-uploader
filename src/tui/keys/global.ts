import { prepareScreenshot, uploadScreenshots } from "../../core/screenshot.ts";
import { isSteamRunning } from "../../core/steam.ts";
import type { Screenshot } from "../../core/types.ts";
import type { KeyHandler, AppState, AppAction } from "./types.ts";

export const handleGlobalKeys: KeyHandler = ({ input, key }, state, dispatch) => {
  if (input === "q") {
    process.exit(0);
  }

  if (key.tab) {
    dispatch({
      type: "SET",
      key: "activePanel",
      value: state.activePanel === "browser" ? "selected" : "browser",
    });
    return true;
  }

  if (input === "g") {
    dispatch({
      type: "MERGE",
      patch: { showGamePicker: true, gamePickerFocusIndex: 0, gameSearchTerm: "" },
    });
    return true;
  }

  if (input === "p") {
    dispatch({ type: "MERGE", patch: { showUserPicker: true, userPickerFocusIndex: 0 } });
    return true;
  }

  if (input === "u") {
    void handleUpload(state, dispatch);
    return true;
  }

  return false;
};

async function handleUpload(state: AppState, dispatch: (action: AppAction) => void) {
  if (state.selectedFiles.length === 0) {
    dispatch({ type: "SET", key: "status", value: "⚠️  No files selected" });
    return;
  }
  if (!state.selectedGame) {
    dispatch({ type: "SET", key: "status", value: "⚠️  No game selected. Press [g] to choose." });
    return;
  }
  if (!state.selectedUser) {
    dispatch({ type: "SET", key: "status", value: "⚠️  No user selected. Press [p] to choose." });
    return;
  }

  const steamRunning = await isSteamRunning();
  if (steamRunning) {
    dispatch({
      type: "SET",
      key: "status",
      value: "⚠️  Steam is running! Please close Steam first.",
    });
    return;
  }

  dispatch({ type: "MERGE", patch: { isUploading: true, status: "Preparing screenshots..." } });

  const screenshots: Screenshot[] = [];
  for (const file of state.selectedFiles) {
    const s = await prepareScreenshot(file.path);
    if (s) screenshots.push(s);
  }

  if (screenshots.length === 0) {
    dispatch({
      type: "MERGE",
      patch: { isUploading: false, status: "❌ No valid images to upload" },
    });
    return;
  }

  dispatch({ type: "SET", key: "status", value: "Uploading..." });
  const result = await uploadScreenshots(
    screenshots,
    {
      userId: state.selectedUser.userId,
      someId: state.selectedUser.someId,
      gameId: state.selectedGame.appId,
      steamDir: state.steamDir!,
    },
    (progress) => {
      dispatch({
        type: "SET",
        key: "uploadProgress",
        value: { current: progress.current, total: progress.total },
      });
      dispatch({ type: "SET", key: "status", value: `Processing: ${progress.filename}` });
    },
  );

  dispatch({
    type: "MERGE",
    patch: {
      isUploading: false,
      uploadProgress: null,
      status: `✅ Done! ${result.success} uploaded, ${result.skipped} skipped, ${result.failed} failed. Start Steam to sync.`,
      selectedFiles: [],
    },
  });
}
