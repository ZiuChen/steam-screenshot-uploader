import { resolveGames } from "../../core/game.ts";
import type { KeyHandler, AppState, AppAction } from "./types.ts";

export function getFilteredGames(state: AppState) {
  const term = state.gameSearchTerm.toLowerCase();
  if (!term) return state.games.slice(0, 50);
  return state.games
    .filter((g) => g.appId.includes(term) || g.name.toLowerCase().includes(term))
    .slice(0, 50);
}

export const handleGamePickerKeys: KeyHandler = ({ input, key }, state, dispatch) => {
  if (!state.showGamePicker) return false;

  if (key.escape) {
    dispatch({ type: "SET", key: "showGamePicker", value: false });
    return true;
  }
  if (key.upArrow || input === "k") {
    dispatch({
      type: "SET",
      key: "gamePickerFocusIndex",
      value: Math.max(0, state.gamePickerFocusIndex - 1),
    });
    return true;
  }
  if (key.downArrow || input === "j") {
    const filtered = getFilteredGames(state);
    dispatch({
      type: "SET",
      key: "gamePickerFocusIndex",
      value: Math.min(filtered.length - 1, state.gamePickerFocusIndex + 1),
    });
    return true;
  }
  if (key.return) {
    const filtered = getFilteredGames(state);
    const game = filtered[state.gamePickerFocusIndex];
    if (game) {
      dispatch({
        type: "MERGE",
        patch: {
          selectedGame: game,
          showGamePicker: false,
          status: `Game: ${game.appId} - ${game.name}`,
        },
      });
    }
    return true;
  }
  if (key.backspace) {
    dispatch({
      type: "MERGE",
      patch: { gameSearchTerm: state.gameSearchTerm.slice(0, -1), gamePickerFocusIndex: 0 },
    });
    return true;
  }
  // Typing characters for search
  if (input && input.length === 1 && !key.ctrl && !key.meta) {
    dispatch({
      type: "MERGE",
      patch: { gameSearchTerm: state.gameSearchTerm + input, gamePickerFocusIndex: 0 },
    });
    return true;
  }

  return true; // Consume all keys while picker is open
};

export async function loadGamesForUser(
  user: { userId: string; vdfPath: string },
  steamDir: string,
  dispatch: (action: AppAction) => void,
) {
  const games = await resolveGames(steamDir, steamDir + "/userdata", user.userId, user.vdfPath);
  dispatch({ type: "SET", key: "games", value: games });
  if (games.length > 0) {
    dispatch({ type: "SET", key: "selectedGame", value: games[0]! });
  }
}
