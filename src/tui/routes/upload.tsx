import { useState, useEffect, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { useAppState, useAppDispatch } from "@/tui/store.ts";
import { useLaunchOptions } from "@/tui/app.tsx";
import { loadGamesForUser } from "@/tui/components/game-picker.tsx";
import { isSteamRunning } from "@/core/steam.ts";
import { prepareScreenshot, uploadScreenshots } from "@/core/screenshot.ts";
import { formatGameDisplay } from "@/core/game.ts";
import { formatUserDisplay } from "@/core/user.ts";
import type { Screenshot } from "@/core/types.ts";
import { basename } from "node:path";

type UploadStep = "loading" | "select-user" | "select-game" | "confirm" | "uploading" | "done";

export function UploadScreen() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const options = useLaunchOptions();

  const [step, setStep] = useState<UploadStep>("loading");
  const [focusIndex, setFocusIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmChoice, setConfirmChoice] = useState(0);
  const [uploadResult, setUploadResult] = useState<{
    success: number;
    skipped: number;
    failed: number;
  } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    filename: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filePaths = options.filePaths ?? [];

  // Transition from loading to first interactive step
  useEffect(() => {
    if (step !== "loading" || state.status !== "Ready") return;

    if (state.users.length === 0) return; // Will show error in render

    // Determine first interactive step (pre-selection handled by initializeApp)
    if (!options.userId && state.users.length > 1) {
      setStep("select-user");
    } else if (!options.gameId) {
      setStep("select-game");
    } else {
      setStep("confirm");
    }
  }, [step, state.status]);

  const filteredGames = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return state.games.slice(0, 50);
    return state.games
      .filter((g) => g.appId.includes(term) || g.name.toLowerCase().includes(term))
      .slice(0, 50);
  }, [state.games, searchTerm]);

  // Loading/error keys
  useInput(
    (input) => {
      if (input === "q") process.exit(0);
    },
    { isActive: step === "loading" },
  );

  // User selection keys
  useInput(
    (input, key) => {
      if (input === "q") process.exit(0);
      if (key.upArrow || input === "k") {
        setFocusIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow || input === "j") {
        setFocusIndex((i) => Math.min(state.users.length - 1, i + 1));
        return;
      }
      if (key.return) {
        const user = state.users[focusIndex];
        if (user) {
          dispatch({ type: "SET", key: "selectedUser", value: user });
          if (state.steamDir && user.userId !== state.selectedUser?.userId) {
            void loadGamesForUser(user, state.steamDir, dispatch);
          }
          setFocusIndex(0);
          setSearchTerm("");
          setStep("select-game");
        }
      }
    },
    { isActive: step === "select-user" },
  );

  // Game selection keys
  useInput(
    (input, key) => {
      if (input === "q") process.exit(0);
      if (key.escape) {
        if (!options.userId && state.users.length > 1) {
          setStep("select-user");
          setFocusIndex(0);
          setSearchTerm("");
        }
        return;
      }
      if (key.upArrow || input === "k") {
        setFocusIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow || input === "j") {
        setFocusIndex((i) => Math.min(filteredGames.length - 1, i + 1));
        return;
      }
      if (key.return) {
        const game = filteredGames[focusIndex];
        if (game) {
          dispatch({ type: "SET", key: "selectedGame", value: game });
          setStep("confirm");
        }
        return;
      }
      if (key.backspace) {
        setSearchTerm((t) => t.slice(0, -1));
        setFocusIndex(0);
        return;
      }
      if (input && input.length === 1 && !key.ctrl && !key.meta) {
        setSearchTerm((t) => t + input);
        setFocusIndex(0);
      }
    },
    { isActive: step === "select-game" },
  );

  // Confirm keys
  useInput(
    (input, key) => {
      if (input === "q") process.exit(0);
      if (key.escape) {
        setStep("select-game");
        setFocusIndex(0);
        return;
      }
      if (key.leftArrow || key.rightArrow || key.tab) {
        setConfirmChoice((c) => (c === 0 ? 1 : 0));
        return;
      }
      if (key.return) {
        if (confirmChoice === 0) {
          setStep("uploading");
          void performUpload();
        } else {
          process.exit(0);
        }
      }
    },
    { isActive: step === "confirm" },
  );

  // Done keys
  useInput(
    (input, key) => {
      if (input === "q" || key.return) process.exit(0);
    },
    { isActive: step === "done" },
  );

  async function performUpload() {
    if (!state.selectedUser || !state.selectedGame || !state.steamDir) return;

    const steamRunning = await isSteamRunning();
    if (steamRunning) {
      setErrorMessage("Steam is running. Please close Steam and try again.");
      setStep("done");
      return;
    }

    const screenshots: Screenshot[] = [];
    for (const path of filePaths) {
      const s = await prepareScreenshot(path);
      if (s) screenshots.push(s);
    }

    if (screenshots.length === 0) {
      setErrorMessage("No valid images to upload.");
      setStep("done");
      return;
    }

    const result = await uploadScreenshots(
      screenshots,
      {
        userId: state.selectedUser.userId,
        someId: state.selectedUser.someId,
        gameId: state.selectedGame.appId,
        steamDir: state.steamDir,
      },
      (progress) => {
        setUploadProgress({
          current: progress.current,
          total: progress.total,
          filename: progress.filename,
        });
      },
    );

    setUploadResult(result);
    setStep("done");
  }

  // --- Render ---

  if (step === "loading") {
    const noUsers = state.status === "Ready" && state.users.length === 0;
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="yellow">
          {" "}
          Upload Screenshots{" "}
        </Text>
        {noUsers ? (
          <Box flexDirection="column" marginTop={1}>
            <Text color="red">❌ No Steam users found. Has Steam been logged in?</Text>
            <Text color="gray">Press q to exit.</Text>
          </Box>
        ) : (
          <Box marginTop={1}>
            <Text color="gray">{state.status}</Text>
          </Box>
        )}
      </Box>
    );
  }

  if (step === "select-user") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="yellow">
          {" "}
          Select User{" "}
        </Text>
        <Text color="gray" dimColor>
          ↑↓/jk Navigate · Enter Select · q Quit
        </Text>
        <Box flexDirection="column" marginTop={1}>
          {state.users.map((user, index) => (
            <Box
              key={user.userId}
              paddingLeft={1}
              backgroundColor={index === focusIndex ? "#333366" : undefined}
            >
              <Text color={index === focusIndex ? "white" : "gray"}>{user.userId}</Text>
              <Text color={index === focusIndex ? "white" : undefined}> - {user.personalName}</Text>
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  if (step === "select-game") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="yellow">
          {" "}
          Select Game{" "}
        </Text>
        <Text color="gray" dimColor>
          ↑↓/jk Navigate · Enter Select · Type to search · Esc Back · q Quit
        </Text>
        <Box gap={1} marginTop={1}>
          <Text color="gray">Search:</Text>
          <Text>{searchTerm || "(type to filter)"}</Text>
        </Box>
        <Box flexDirection="column" marginTop={1}>
          {filteredGames.map((game, index) => (
            <Box
              key={game.appId}
              paddingLeft={1}
              backgroundColor={index === focusIndex ? "#333366" : undefined}
            >
              <Text color="gray">{game.appId}</Text>
              <Text> - {game.name}</Text>
              {game.isShortcut && <Text color="#FF8800"> (Non-Steam)</Text>}
            </Box>
          ))}
          {filteredGames.length === 0 && (
            <Box paddingLeft={1}>
              <Text color="#555555">No games found.</Text>
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  if (step === "confirm") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="yellow">
          {" "}
          Upload Summary{" "}
        </Text>
        <Box flexDirection="column" marginTop={1}>
          <Text>
            {"  "}User: {state.selectedUser ? formatUserDisplay(state.selectedUser) : "None"}
          </Text>
          <Text>
            {"  "}Game: {state.selectedGame ? formatGameDisplay(state.selectedGame) : "None"}
          </Text>
          <Text>
            {"  "}Files ({filePaths.length}):
          </Text>
          {filePaths.slice(0, 10).map((p) => (
            <Text key={p} color="gray">
              {"    "}- {basename(p)}
            </Text>
          ))}
          {filePaths.length > 10 && (
            <Text color="gray">
              {"    "}... and {filePaths.length - 10} more
            </Text>
          )}
        </Box>
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            Esc Back · ←→/Tab Switch · Enter Confirm · q Quit
          </Text>
        </Box>
        <Box marginTop={1} gap={2}>
          <Text
            backgroundColor={confirmChoice === 0 ? "green" : undefined}
            color={confirmChoice === 0 ? "white" : "gray"}
          >
            {" "}
            Yes, upload{" "}
          </Text>
          <Text
            backgroundColor={confirmChoice === 1 ? "red" : undefined}
            color={confirmChoice === 1 ? "white" : "gray"}
          >
            {" "}
            Cancel{" "}
          </Text>
        </Box>
      </Box>
    );
  }

  if (step === "uploading") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="yellow">
          {" "}
          Uploading...{" "}
        </Text>
        {uploadProgress && (
          <Box flexDirection="column" marginTop={1}>
            <Text>
              [{uploadProgress.current}/{uploadProgress.total}] {uploadProgress.filename}
            </Text>
            <Text color="gray">
              {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
            </Text>
          </Box>
        )}
      </Box>
    );
  }

  if (step === "done") {
    return (
      <Box flexDirection="column" padding={1}>
        {errorMessage ? (
          <Box flexDirection="column">
            <Text bold color="red">
              {" "}
              ❌ Error{" "}
            </Text>
            <Box marginTop={1}>
              <Text color="red">{errorMessage}</Text>
            </Box>
          </Box>
        ) : (
          <Box flexDirection="column">
            <Text bold color="green">
              {" "}
              Upload Complete{" "}
            </Text>
            {uploadResult && (
              <Box flexDirection="column" marginTop={1}>
                <Text color="green">
                  {"  "}✅ Success: {uploadResult.success}
                </Text>
                <Text color="yellow">
                  {"  "}⏭️ Skipped: {uploadResult.skipped}
                </Text>
                <Text color="red">
                  {"  "}❌ Failed: {uploadResult.failed}
                </Text>
                {uploadResult.success > 0 && (
                  <Box marginTop={1}>
                    <Text color="gray">Start Steam to sync screenshots to the cloud.</Text>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}
        <Box marginTop={1}>
          <Text color="gray">Press Enter or q to exit.</Text>
        </Box>
      </Box>
    );
  }

  return null;
}
