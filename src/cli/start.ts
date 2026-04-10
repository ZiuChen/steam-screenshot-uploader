import { defineCommand } from "citty";

export const startCommand = defineCommand({
  meta: {
    name: "start",
    description: "Launch the interactive TUI for browsing and uploading screenshots",
  },
  args: {
    "steam-dir": {
      type: "string",
      description: "Path to Steam installation directory",
      required: false,
    },
    "user-id": {
      type: "string",
      description: "Pre-select a Steam user by ID",
      required: false,
    },
    "game-id": {
      type: "string",
      description: "Pre-select a game by app ID",
      required: false,
    },
  },
  async run({ args }) {
    // Dynamic import to avoid loading TUI deps when not needed
    const { launchTui } = await import("@/tui/app.tsx");
    launchTui({
      customSteamDir: args["steam-dir"],
      userId: args["user-id"],
      gameId: args["game-id"],
    });
  },
});
