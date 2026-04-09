import { loadGamesForUser } from "./game-picker.ts";
import type { KeyHandler } from "./types.ts";

export const handleUserPickerKeys: KeyHandler = ({ input, key }, state, dispatch) => {
  if (!state.showUserPicker) return false;

  if (key.escape) {
    dispatch({ type: "SET", key: "showUserPicker", value: false });
    return true;
  }
  if (key.upArrow || input === "k") {
    dispatch({
      type: "SET",
      key: "userPickerFocusIndex",
      value: Math.max(0, state.userPickerFocusIndex - 1),
    });
    return true;
  }
  if (key.downArrow || input === "j") {
    dispatch({
      type: "SET",
      key: "userPickerFocusIndex",
      value: Math.min(state.users.length - 1, state.userPickerFocusIndex + 1),
    });
    return true;
  }
  if (key.return) {
    const user = state.users[state.userPickerFocusIndex];
    if (user) {
      dispatch({
        type: "MERGE",
        patch: {
          selectedUser: user,
          showUserPicker: false,
          status: `User: ${user.userId} - ${user.personalName}`,
        },
      });
      if (state.steamDir) {
        void loadGamesForUser(user, state.steamDir, dispatch);
      }
    }
    return true;
  }

  return true; // Consume all keys while picker is open
};
