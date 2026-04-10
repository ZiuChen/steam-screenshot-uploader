import { Box, Text, useInput } from "ink";
import { useAppState, useAppDispatch, type AppState, type AppAction } from "../store.ts";
import { resolveGames } from "../../core/game.ts";

export function getFilteredGames(state: AppState) {
  const term = state.gameSearchTerm.toLowerCase();
  if (!term) return state.games.slice(0, 50);
  return state.games
    .filter((g) => g.appId.includes(term) || g.name.toLowerCase().includes(term))
    .slice(0, 50);
}

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

export function GamePicker() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  useInput(
    (input, key) => {
      if (key.escape) {
        dispatch({ type: "SET", key: "showGamePicker", value: false });
        return;
      }
      if (key.upArrow || input === "k") {
        dispatch({
          type: "SET",
          key: "gamePickerFocusIndex",
          value: Math.max(0, state.gamePickerFocusIndex - 1),
        });
        return;
      }
      if (key.downArrow || input === "j") {
        const filtered = getFilteredGames(state);
        dispatch({
          type: "SET",
          key: "gamePickerFocusIndex",
          value: Math.min(filtered.length - 1, state.gamePickerFocusIndex + 1),
        });
        return;
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
        return;
      }
      if (key.backspace) {
        dispatch({
          type: "MERGE",
          patch: { gameSearchTerm: state.gameSearchTerm.slice(0, -1), gamePickerFocusIndex: 0 },
        });
        return;
      }
      if (input && input.length === 1 && !key.ctrl && !key.meta) {
        dispatch({
          type: "MERGE",
          patch: { gameSearchTerm: state.gameSearchTerm + input, gamePickerFocusIndex: 0 },
        });
      }
    },
    { isActive: state.showGamePicker },
  );

  if (!state.showGamePicker) return null;

  const filtered = getFilteredGames(state);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1}>
      <Text bold> Select Game (ESC to cancel, type to search) </Text>
      <Box gap={1} marginBottom={1}>
        <Text color="gray">Search:</Text>
        <Text>{state.gameSearchTerm || "(type to filter)"}</Text>
      </Box>
      <Box flexDirection="column" overflowY="hidden">
        {filtered.map((game, index) => (
          <Box
            key={game.appId}
            paddingLeft={1}
            backgroundColor={index === state.gamePickerFocusIndex ? "#333366" : undefined}
          >
            <Text color="gray">{game.appId}</Text>
            <Text> - {game.name}</Text>
            {game.isShortcut && <Text color="#FF8800"> (Non-Steam)</Text>}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
