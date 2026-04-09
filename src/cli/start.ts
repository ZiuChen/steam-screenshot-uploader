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
  },
  async run({ args }) {
    // Dynamic import to avoid loading TUI deps when not needed
    const { launchTui } = await import("../tui/app.tsx");
    launchTui(args["steam-dir"]);
  },
});
