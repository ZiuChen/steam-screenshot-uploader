import { defineCommand } from "citty";
import { startCommand } from "@/cli/start.ts";
import { uploadCommand } from "@/cli/upload.ts";
import pkg from "../../package.json" with { type: "json" };

export const main = defineCommand({
  meta: {
    name: "ssu",
    version: pkg.version,
    description: "Upload custom screenshots to Steam Cloud",
  },
  subCommands: {
    start: startCommand,
    upload: uploadCommand,
  },
});
