import { useEffect, useMemo, useState } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import { useAppState, useAppDispatch } from "@/tui/store.ts";
import { formatFileSize } from "@/utils/fs.ts";
import { handleSelectedRemove } from "@/tui/components/file-browser.tsx";

export function SelectedList() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { stdout } = useStdout();
  const [scrollOffset, setScrollOffset] = useState(0);

  const maxVisibleRows = Math.max(3, (stdout?.rows ?? 24) - 10);

  useInput(
    (input, key) => {
      if (key.upArrow || input === "k") {
        dispatch({
          type: "SET",
          key: "selectedFocusIndex",
          value: Math.max(0, state.selectedFocusIndex - 1),
        });
        return;
      }
      if (key.downArrow || input === "j") {
        dispatch({
          type: "SET",
          key: "selectedFocusIndex",
          value: Math.min(state.selectedFiles.length - 1, state.selectedFocusIndex + 1),
        });
        return;
      }
      if (input === " " || key.backspace || key.delete) {
        handleSelectedRemove(state, dispatch);
      }
    },
    {
      isActive: state.activePanel === "selected" && !state.showGamePicker && !state.showUserPicker,
    },
  );

  // Keep focused item in view
  useEffect(() => {
    const idx = state.selectedFocusIndex;
    if (idx < scrollOffset) {
      setScrollOffset(idx);
    } else if (idx >= scrollOffset + maxVisibleRows) {
      setScrollOffset(idx - maxVisibleRows + 1);
    }
  }, [state.selectedFocusIndex, maxVisibleRows]);

  const visibleFiles = useMemo(
    () => state.selectedFiles.slice(scrollOffset, scrollOffset + maxVisibleRows),
    [state.selectedFiles, scrollOffset, maxVisibleRows],
  );

  const showScrollIndicator = state.selectedFiles.length > maxVisibleRows;

  return (
    <Box
      flexDirection="column"
      width="40%"
      borderStyle="single"
      borderColor={state.activePanel === "selected" ? "#00AAFF" : "#444"}
    >
      <Box paddingLeft={1}>
        <Text bold>
          {" "}
          Selected ({state.selectedFiles.length}){" "}
          {showScrollIndicator && (
            <Text color="gray">
              [{scrollOffset + 1}-
              {Math.min(scrollOffset + maxVisibleRows, state.selectedFiles.length)}/
              {state.selectedFiles.length}]
            </Text>
          )}
        </Text>
      </Box>
      <Box flexDirection="column" flexGrow={1} overflowY="hidden">
        {state.selectedFiles.length === 0 ? (
          <Box paddingLeft={1} paddingTop={1}>
            <Text color="#555555">No files selected.{"\n"}Use Enter to select/remove files.</Text>
          </Box>
        ) : (
          visibleFiles.map((file, idx) => {
            const index = scrollOffset + idx;
            return (
              <Box
                key={file.path}
                paddingLeft={1}
                paddingRight={1}
                backgroundColor={
                  state.activePanel === "selected" && index === state.selectedFocusIndex
                    ? "#333366"
                    : undefined
                }
              >
                <Text color="green" wrap="truncate">
                  ✅ {file.name}
                </Text>
                <Text color="gray"> {formatFileSize(file.size)}</Text>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
}
