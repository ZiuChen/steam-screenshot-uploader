import { defineCommand } from "citty";
import { isSupportedFormat } from "@/core/screenshot.ts";
import { resolve } from "node:path";
import { globSync } from "node:fs";

export const uploadCommand = defineCommand({
  meta: {
    name: "upload",
    description: "Upload screenshots to Steam (interactive TUI)",
  },
  args: {
    "game-id": {
      type: "string",
      description: "Target game ID",
      required: false,
    },
    "user-id": {
      type: "string",
      description: "Steam user ID",
      required: false,
    },
    "steam-dir": {
      type: "string",
      description: "Path to Steam installation directory",
      required: false,
    },
    files: {
      type: "positional",
      description: "Glob patterns for image files (e.g. '*.png' './screenshots/**/*.jpg')",
      required: true,
    },
  },
  async run({ args }) {
    // Resolve glob patterns to file paths
    const patterns: string[] = args.files
      ? Array.isArray(args.files)
        ? args.files
        : [args.files]
      : [];

    if (patterns.length === 0) {
      console.error("❌ No glob patterns provided. Usage: ssu upload '*.png'");
      process.exit(1);
    }

    const filePaths: string[] = [];
    for (const pattern of patterns) {
      const matches = globSync(pattern, { cwd: process.cwd() });
      for (const match of matches) {
        filePaths.push(resolve(match));
      }
    }

    const supported = filePaths.filter((p) => {
      if (!isSupportedFormat(p)) {
        console.log(`⊘ Skipping unsupported format: ${p}`);
        return false;
      }
      return true;
    });

    if (supported.length === 0) {
      console.error("❌ No supported image files found.");
      process.exit(1);
    }

    // Launch TUI upload flow
    const { launchTui } = await import("@/tui/app.tsx");
    launchTui({
      initialRoute: "/upload",
      customSteamDir: args["steam-dir"],
      filePaths: supported,
      userId: args["user-id"],
      gameId: args["game-id"],
    });
  },
});
