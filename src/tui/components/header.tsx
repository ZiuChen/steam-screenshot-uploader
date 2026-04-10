import { Box, Text } from "ink";
import { useAppState } from "@/tui/store.ts";

export function Header() {
  const state = useAppState();

  return (
    <Box
      flexDirection="column"
      width="100%"
      borderStyle="round"
      borderColor="#666"
      paddingLeft={1}
      paddingRight={1}
    >
      <Box justifyContent="space-between">
        <Text color={state.steamValid ? "green" : "red"}>
          Steam: {state.steamDir ?? "Not detected"}
        </Text>
        <Text color="gray">User: {state.selectedUser?.personalName ?? "None"}</Text>
      </Box>
      <Box justifyContent="space-between">
        <Text color="gray">
          Game:{" "}
          {state.selectedGame
            ? `${state.selectedGame.appId} - ${state.selectedGame.name}`
            : "None selected"}
        </Text>
      </Box>
    </Box>
  );
}
