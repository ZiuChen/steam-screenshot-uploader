import { defineCommand } from "citty";
import { detectSteamDir, isSteamRunning } from "../core/steam.ts";
import { discoverUsers, formatUserDisplay } from "../core/user.ts";
import { resolveGames, formatGameDisplay } from "../core/game.ts";
import { prepareScreenshot, uploadScreenshots } from "../core/screenshot.ts";
import { isSupportedFormat } from "../core/screenshot.ts";
import type { SteamUser, SteamGame, Screenshot } from "../core/types.ts";
import { basename, resolve } from "node:path";
import { globSync } from "node:fs";
import * as readline from "node:readline";

function createPrompt(): {
  question: (query: string) => Promise<string>;
  close: () => void;
} {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return {
    question: (query: string) => new Promise((res) => rl.question(query, res)),
    close: () => rl.close(),
  };
}

async function selectFromList<T>(
  prompt: ReturnType<typeof createPrompt>,
  label: string,
  items: T[],
  display: (item: T) => string,
): Promise<T> {
  console.log(`\n${label}:`);
  items.forEach((item, i) => {
    console.log(`  ${i + 1}. ${display(item)}`);
  });

  while (true) {
    const answer = await prompt.question(`\nEnter number (1-${items.length}): `);
    const idx = Number.parseInt(answer.trim(), 10) - 1;
    if (idx >= 0 && idx < items.length) {
      return items[idx]!;
    }
    console.log("Invalid selection, please try again.");
  }
}

export const uploadCommand = defineCommand({
  meta: {
    name: "upload",
    description: "Upload screenshots to Steam (interactive or with arguments)",
  },
  args: {
    "game-id": {
      type: "string",
      description: "Target game ID (required or interactive)",
      required: false,
    },
    "user-id": {
      type: "string",
      description: "Steam user ID (defaults to first detected)",
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
      required: false,
    },
  },
  async run({ args }) {
    const prompt = createPrompt();

    try {
      // 1. Detect Steam directory
      const steam = detectSteamDir(args["steam-dir"]);
      if (!steam.isValid) {
        console.error(`❌ Steam directory not found at: ${steam.steamDir}`);
        console.error("   Use --steam-dir to specify the correct path.");
        process.exit(1);
      }
      console.log(`🔍 Steam directory: ${steam.steamDir}`);

      // 2. Discover users
      const users = await discoverUsers(steam.userDataDir);
      if (users.length === 0) {
        console.error("❌ No Steam users found. Has Steam been logged in?");
        process.exit(1);
      }

      let selectedUser: SteamUser;
      if (args["user-id"]) {
        const found = users.find((u) => u.userId === args["user-id"]);
        if (!found) {
          console.error(`❌ User ID ${args["user-id"]} not found.`);
          console.error("   Available users:");
          users.forEach((u) => console.error(`     ${formatUserDisplay(u)}`));
          process.exit(1);
        }
        selectedUser = found;
      } else if (users.length === 1) {
        selectedUser = users[0]!;
      } else {
        selectedUser = await selectFromList(prompt, "Select user", users, formatUserDisplay);
      }
      console.log(`👤 User: ${formatUserDisplay(selectedUser)}`);

      // 3. Resolve games
      const games = await resolveGames(
        steam.steamDir,
        steam.userDataDir,
        selectedUser.userId,
        selectedUser.vdfPath,
      );

      let selectedGame: SteamGame;
      if (args["game-id"]) {
        const found = games.find((g) => g.appId === args["game-id"]);
        selectedGame = found ?? {
          appId: args["game-id"],
          name: `Game ${args["game-id"]}`,
          isShortcut: false,
        };
      } else {
        if (games.length === 0) {
          const gameId = await prompt.question("\nNo existing games found. Enter game ID: ");
          selectedGame = {
            appId: gameId.trim(),
            name: `Game ${gameId.trim()}`,
            isShortcut: false,
          };
        } else {
          selectedGame = await selectFromList(
            prompt,
            "Select target game",
            games,
            formatGameDisplay,
          );
        }
      }
      console.log(`🎮 Game: ${formatGameDisplay(selectedGame)}`);

      // 4. Collect files via glob
      let filePaths: string[] = [];
      const patterns: string[] = args.files
        ? Array.isArray(args.files)
          ? args.files
          : [args.files]
        : [];

      if (patterns.length === 0) {
        const answer = await prompt.question("\nEnter glob pattern(s), space-separated: ");
        patterns.push(...answer.trim().split(/\s+/).filter(Boolean));
      }

      if (patterns.length === 0) {
        console.error("❌ No glob patterns provided.");
        process.exit(1);
      }

      for (const pattern of patterns) {
        const matches = globSync(pattern, { cwd: process.cwd() });
        for (const match of matches) {
          filePaths.push(resolve(match));
        }
      }

      filePaths = filePaths.filter((p) => {
        if (!isSupportedFormat(p)) {
          console.log(`⊘ Skipping unsupported format: ${p}`);
          return false;
        }
        return true;
      });

      if (filePaths.length === 0) {
        console.error("❌ No supported image files found.");
        process.exit(1);
      }

      // 5. Confirmation step
      console.log("\n" + "═".repeat(50));
      console.log("  📋 Upload Summary");
      console.log("═".repeat(50));
      console.log(`  👤 User:      ${formatUserDisplay(selectedUser)}`);
      console.log(`  🎮 Game:      ${formatGameDisplay(selectedGame)}`);
      console.log(`  📂 Steam Dir: ${steam.steamDir}`);
      console.log(`  📁 Images (${filePaths.length}):`);
      for (const p of filePaths) {
        console.log(`     - ${basename(p)}`);
      }
      console.log("═".repeat(50));

      const confirmAnswer = await prompt.question("\n  Proceed with upload? (y/N): ");
      if (confirmAnswer.trim().toLowerCase() !== "y") {
        console.log("Aborted.");
        process.exit(0);
      }

      // 6. Check Steam process
      const steamRunning = await isSteamRunning();
      if (steamRunning) {
        console.log(
          "\n⚠️  Steam appears to be running. Writing to VDF while Steam is running may cause data corruption.",
        );
        const answer = await prompt.question("   Continue anyway? (y/N): ");
        if (answer.trim().toLowerCase() !== "y") {
          console.log("Aborted. Please close Steam and try again.");
          process.exit(0);
        }
      }

      // 7. Prepare screenshots
      console.log("\n📸 Processing screenshots...");
      const screenshots: Screenshot[] = [];
      for (const path of filePaths) {
        const s = await prepareScreenshot(path);
        if (s) {
          screenshots.push(s);
        } else {
          console.log(`⚠️  Skipping invalid image: ${path}`);
        }
      }

      if (screenshots.length === 0) {
        console.error("❌ No valid images to upload.");
        process.exit(1);
      }

      // 8. Upload
      const result = await uploadScreenshots(
        screenshots,
        {
          userId: selectedUser.userId,
          someId: selectedUser.someId,
          gameId: selectedGame.appId,
          steamDir: steam.steamDir,
        },
        (progress) => {
          const icon =
            progress.status === "done"
              ? "✅"
              : progress.status === "skipped"
                ? "⏭️"
                : progress.status === "error"
                  ? "❌"
                  : "⏳";
          console.log(
            `  ${icon} [${progress.current}/${progress.total}] ${progress.filename}${progress.error ? ` - ${progress.error}` : ""}`,
          );
        },
      );

      console.log(
        `\n✅ Done! ${result.success} uploaded, ${result.skipped} skipped, ${result.failed} failed.`,
      );
      if (result.success > 0) {
        console.log(`   Screenshots added to "${selectedGame.name}" (${selectedGame.appId}).`);
        console.log("   Start Steam to sync them to the cloud.");
      }
    } finally {
      prompt.close();
    }
  },
});
