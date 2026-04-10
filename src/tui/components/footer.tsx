import { Box, Text } from "ink";
import { useAppState } from "@/tui/store.ts";

export function Footer() {
  const state = useAppState();

  return (
    <Box
      width="100%"
      borderStyle="round"
      borderColor="#666"
      flexDirection="column"
      paddingLeft={1}
      paddingRight={1}
    >
      <Box gap={2} flexWrap="wrap">
        <Text>
          <Text color="yellow">[↑↓/jk]</Text> <Text color="gray">Navigate</Text>
        </Text>
        <Text>
          <Text color="yellow">[Enter]</Text> <Text color="gray">Select</Text>
        </Text>
        <Text>
          <Text color="yellow">[Tab]</Text> <Text color="gray">Panel</Text>
        </Text>
        <Text>
          <Text color="yellow">[←→]</Text> <Text color="gray">Dir</Text>
        </Text>
        <Text>
          <Text color="yellow">[g]</Text> <Text color="gray">Game</Text>
        </Text>
        <Text>
          <Text color="yellow">[p]</Text> <Text color="gray">User</Text>
        </Text>
        <Text>
          <Text color="yellow">[u]</Text> <Text color="gray">Upload</Text>
        </Text>
        <Text>
          <Text color="yellow">[q]</Text> <Text color="gray">Quit</Text>
        </Text>
      </Box>
      <Text color={state.isUploading ? "yellow" : "gray"}>
        {state.status}
        {state.uploadProgress
          ? ` [${state.uploadProgress.current}/${state.uploadProgress.total}]`
          : ""}
      </Text>
    </Box>
  );
}
