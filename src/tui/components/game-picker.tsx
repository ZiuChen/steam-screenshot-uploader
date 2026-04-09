import { Box, Text } from "ink";
import { useAppState } from "../store.ts";
import { getFilteredGames } from "../keys/game-picker.ts";

export function GamePicker() {
  const state = useAppState();

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
