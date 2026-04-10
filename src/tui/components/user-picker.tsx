import { Box, Text, useInput } from "ink";
import { useAppState, useAppDispatch } from "../store.ts";
import { loadGamesForUser } from "./game-picker.tsx";

export function UserPicker() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  useInput(
    (input, key) => {
      if (key.escape) {
        dispatch({ type: "SET", key: "showUserPicker", value: false });
        return;
      }
      if (key.upArrow || input === "k") {
        dispatch({
          type: "SET",
          key: "userPickerFocusIndex",
          value: Math.max(0, state.userPickerFocusIndex - 1),
        });
        return;
      }
      if (key.downArrow || input === "j") {
        dispatch({
          type: "SET",
          key: "userPickerFocusIndex",
          value: Math.min(state.users.length - 1, state.userPickerFocusIndex + 1),
        });
        return;
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
      }
    },
    { isActive: state.showUserPicker },
  );

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
