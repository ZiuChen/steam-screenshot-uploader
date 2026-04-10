import { useState, useEffect } from "react";
import { useInput } from "ink";
import { useAppState, useAppDispatch, type AppState, type AppAction } from "@/tui/store.ts";
import { Header } from "@/tui/components/header.tsx";
import { Footer } from "@/tui/components/footer.tsx";
import { FileBrowser } from "@/tui/components/file-browser.tsx";
import { SelectedList } from "@/tui/components/selected-list.tsx";
import { GamePicker } from "@/tui/components/game-picker.tsx";
import { UserPicker } from "@/tui/components/user-picker.tsx";
import { isSteamRunning } from "@/core/steam.ts";
import { prepareScreenshot, uploadScreenshots } from "@/core/screenshot.ts";
import type { Screenshot } from "@/core/types.ts";

export function MainScreen() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const [ctrlCPending, setCtrlCPending] = useState(false);

  // Auto-clear Ctrl+C pending state after 3 seconds
  useEffect(() => {
    if (!ctrlCPending) return;
    const timer = setTimeout(() => {
      setCtrlCPending(false);
      dispatch({ type: "SET", key: "status", value: "Ready" });
    }, 3000);
    return () => clearTimeout(timer);
  }, [ctrlCPending]);

  // Ctrl+C handler — always active (even when pickers are open)
  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      if (ctrlCPending) {
        process.exit(0);
      }
      setCtrlCPending(true);
      dispatch({ type: "SET", key: "status", value: "Press Ctrl+C again to exit" });
      return;
    }
    if (ctrlCPending) {
      setCtrlCPending(false);
    }
  });

  useInput(
    (input, key) => {
      if (key.tab) {
        dispatch({
          type: "SET",
          key: "activePanel",
          value: state.activePanel === "browser" ? "selected" : "browser",
        });
        return;
      }
      if (input === "g") {
        dispatch({
          type: "MERGE",
          patch: { showGamePicker: true, gamePickerFocusIndex: 0, gameSearchTerm: "" },
        });
        return;
      }
      if (input === "p") {
        dispatch({ type: "MERGE", patch: { showUserPicker: true, userPickerFocusIndex: 0 } });
        return;
      }
      if (key.return) {
        void handleUpload(state, dispatch);
      }
    },
    { isActive: !state.showGamePicker && !state.showUserPicker },
  );

  return (
    <>
      <Header />
      <FileBrowser />
      <SelectedList />
      <Footer />
      <GamePicker />
      <UserPicker />
    </>
  );
}

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
