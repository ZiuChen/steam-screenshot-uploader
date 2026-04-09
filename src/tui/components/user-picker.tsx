import { Box, Text } from "ink";
import { useAppState } from "../store.ts";

export function UserPicker() {
  const state = useAppState();

  if (!state.showUserPicker) return null;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1}>
      <Text bold> Select User (ESC to cancel) </Text>
      <Box flexDirection="column" overflowY="hidden">
        {state.users.map((user, index) => (
          <Box
            key={user.userId}
            paddingLeft={1}
            backgroundColor={index === state.userPickerFocusIndex ? "#333366" : undefined}
          >
            <Text color="gray">{user.userId}</Text>
            <Text> - {user.personalName}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
