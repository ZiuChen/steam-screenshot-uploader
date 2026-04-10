import { useEffect, useMemo, useState } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import { useAppState, useAppDispatch, type AppState, type AppAction } from "../store.ts";
import { readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { isSupportedFormat } from "../../core/screenshot.ts";
import { formatFileSize } from "../../utils/fs.ts";
import type { FileEntry } from "../../core/types.ts";

export function loadDirectory(dirPath: string, selectedFiles: FileEntry[]): FileEntry[] {
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    const files: FileEntry[] = [];

    // Add parent directory entry
    if (dirname(dirPath) !== dirPath) {
      files.push({
        name: "..",
        path: dirname(dirPath),
        size: 0,
        isSupported: false,
        isSelected: false,
      });
    }

    // Add directories first
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (entry.isDirectory()) {
        files.push({
          name: `📂 ${entry.name}/`,
          path: join(dirPath, entry.name),
          size: 0,
          isSupported: false,
          isSelected: false,
        });
      }
    }

    // Add files
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (entry.isFile()) {
        const fullPath = join(dirPath, entry.name);
        const supported = isSupportedFormat(entry.name);
        const size = statSync(fullPath).size;
        const isSelected = selectedFiles.some((f) => f.path === fullPath);

        files.push({
          name: entry.name,
          path: fullPath,
          size,
          isSupported: supported,
          isSelected,
        });
      }
    }

    return files;
  } catch {
    return [];
  }
}

export function handleBrowserSelect(state: AppState, dispatch: (action: AppAction) => void) {
  const file = state.files[state.browserFocusIndex];
  if (!file) return;

  // Navigate into directory
  if (file.name === "..") {
    dispatch({ type: "MERGE", patch: { currentDir: file.path, browserFocusIndex: 0 } });
    return;
  }
  if (file.name.startsWith("📂")) {
    dispatch({ type: "MERGE", patch: { currentDir: file.path, browserFocusIndex: 0 } });
    return;
  }

  // Toggle file selection
  if (!file.isSupported) return;

  const already = state.selectedFiles.findIndex((f) => f.path === file.path);
  if (already >= 0) {
    dispatch({
      type: "MERGE",
      patch: {
        selectedFiles: state.selectedFiles.filter((f) => f.path !== file.path),
      },
    });
    dispatch({
      type: "UPDATE_FILES",
      updater: (files) =>
        files.map((f) => (f.path === file.path ? { ...f, isSelected: false } : f)),
    });
  } else {
    dispatch({
      type: "MERGE",
      patch: {
        selectedFiles: [...state.selectedFiles, { ...file, isSelected: true }],
      },
    });
    dispatch({
      type: "UPDATE_FILES",
      updater: (files) => files.map((f) => (f.path === file.path ? { ...f, isSelected: true } : f)),
    });
  }
}

export function handleSelectedRemove(state: AppState, dispatch: (action: AppAction) => void) {
  const file = state.selectedFiles[state.selectedFocusIndex];
  if (!file) return;

  const newSelected = state.selectedFiles.filter((f) => f.path !== file.path);
  dispatch({ type: "SET", key: "selectedFiles", value: newSelected });
  dispatch({
    type: "UPDATE_FILES",
    updater: (files) => files.map((f) => (f.path === file.path ? { ...f, isSelected: false } : f)),
  });
  // Adjust focus if needed
  if (state.selectedFocusIndex >= newSelected.length && newSelected.length > 0) {
    dispatch({ type: "SET", key: "selectedFocusIndex", value: newSelected.length - 1 });
  }
}

export function FileBrowser() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { stdout } = useStdout();
  const [scrollOffset, setScrollOffset] = useState(0);

  // Reserve rows for header, footer, borders, title
  const maxVisibleRows = Math.max(3, (stdout?.rows ?? 24) - 10);

  useInput(
    (input, key) => {
      if (key.upArrow || input === "k") {
        dispatch({
          type: "SET",
          key: "browserFocusIndex",
          value: Math.max(0, state.browserFocusIndex - 1),
        });
        return;
      }
      if (key.downArrow || input === "j") {
        dispatch({
          type: "SET",
          key: "browserFocusIndex",
          value: Math.min(state.files.length - 1, state.browserFocusIndex + 1),
        });
        return;
      }
      if (key.return) {
        handleBrowserSelect(state, dispatch);
        return;
      }
      if (key.leftArrow) {
        const parentDir = state.files.find((f) => f.name === "..");
        if (parentDir) {
          dispatch({ type: "MERGE", patch: { currentDir: parentDir.path, browserFocusIndex: 0 } });
        }
        return;
      }
      if (key.rightArrow) {
        const file = state.files[state.browserFocusIndex];
        if (file?.name.startsWith("📂")) {
          dispatch({ type: "MERGE", patch: { currentDir: file.path, browserFocusIndex: 0 } });
        }
      }
    },
    {
      isActive: state.activePanel === "browser" && !state.showGamePicker && !state.showUserPicker,
    },
  );

  useEffect(() => {
    const files = loadDirectory(state.currentDir, state.selectedFiles);
    dispatch({ type: "SET", key: "files", value: files });
    setScrollOffset(0);
  }, [state.currentDir]);

  // Keep focused item in view
  useEffect(() => {
    const idx = state.browserFocusIndex;
    if (idx < scrollOffset) {
      setScrollOffset(idx);
    } else if (idx >= scrollOffset + maxVisibleRows) {
      setScrollOffset(idx - maxVisibleRows + 1);
    }
  }, [state.browserFocusIndex, maxVisibleRows]);

  const visibleFiles = useMemo(
    () => state.files.slice(scrollOffset, scrollOffset + maxVisibleRows),
    [state.files, scrollOffset, maxVisibleRows],
  );

  const showScrollIndicator = state.files.length > maxVisibleRows;

  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      borderStyle="single"
      borderColor={state.activePanel === "browser" ? "#00AAFF" : "#444"}
    >
      <Box paddingLeft={1}>
        <Text bold>
          {" "}
          Files: {state.currentDir}{" "}
          {showScrollIndicator && (
            <Text color="gray">
              [{scrollOffset + 1}-{Math.min(scrollOffset + maxVisibleRows, state.files.length)}/
              {state.files.length}]
            </Text>
          )}
        </Text>
      </Box>
      <Box flexDirection="column" flexGrow={1} overflowY="hidden">
        {visibleFiles.map((file, idx) => {
          const index = scrollOffset + idx;
          const isFocused = state.activePanel === "browser" && index === state.browserFocusIndex;
          const isDir = file.name === ".." || file.name.startsWith("📂");
          const fg =
            !file.isSupported && !isDir ? "#555555" : file.isSelected ? "green" : "#CCCCCC";
          const indicator = file.isSelected ? " ✓" : !file.isSupported && !isDir ? " ⊘" : "";

          return (
            <Box
              key={file.path}
              paddingLeft={1}
              paddingRight={1}
              backgroundColor={isFocused ? "#333366" : undefined}
            >
              <Text color={fg} wrap="truncate">
                {file.name}
                {indicator}
              </Text>
              {file.size > 0 && <Text color="gray"> {formatFileSize(file.size)}</Text>}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
