import type { KeyHandler } from "./types.ts";
import { handleBrowserSelect, handleSelectedRemove } from "../components/file-browser.tsx";

export const handleBrowserKeys: KeyHandler = ({ input, key }, state, dispatch) => {
  if (state.activePanel !== "browser") return false;

  if (key.upArrow || input === "k") {
    dispatch({
      type: "SET",
      key: "browserFocusIndex",
      value: Math.max(0, state.browserFocusIndex - 1),
    });
    return true;
  }
  if (key.downArrow || input === "j") {
    dispatch({
      type: "SET",
      key: "browserFocusIndex",
      value: Math.min(state.files.length - 1, state.browserFocusIndex + 1),
    });
    return true;
  }
  if (key.return) {
    handleBrowserSelect(state, dispatch);
    return true;
  }
  if (key.leftArrow) {
    const parentDir = state.files.find((f) => f.name === "..");
    if (parentDir) {
      dispatch({ type: "MERGE", patch: { currentDir: parentDir.path, browserFocusIndex: 0 } });
    }
    return true;
  }
  if (key.rightArrow) {
    const file = state.files[state.browserFocusIndex];
    if (file?.name.startsWith("📂")) {
      dispatch({ type: "MERGE", patch: { currentDir: file.path, browserFocusIndex: 0 } });
    }
    return true;
  }

  return false;
};

export const handleSelectedKeys: KeyHandler = ({ input, key }, state, dispatch) => {
  if (state.activePanel !== "selected") return false;

  if (key.upArrow || input === "k") {
    dispatch({
      type: "SET",
      key: "selectedFocusIndex",
      value: Math.max(0, state.selectedFocusIndex - 1),
    });
    return true;
  }
  if (key.downArrow || input === "j") {
    dispatch({
      type: "SET",
      key: "selectedFocusIndex",
      value: Math.min(state.selectedFiles.length - 1, state.selectedFocusIndex + 1),
    });
    return true;
  }
  if (key.return || key.backspace || key.delete) {
    handleSelectedRemove(state, dispatch);
    return true;
  }

  return false;
};
