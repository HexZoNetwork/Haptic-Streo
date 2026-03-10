import fs from "node:fs";
import path from "node:path";
import { ensureDir, writeTextFile } from "@haptic/utils";
import type { Command } from "commander";
import {
  createProjectPackageJson,
  normalizeModuleFormat,
  normalizeProjectType,
  provisionLocalCliBinary,
} from "./scaffold-shared.js";
import { HapticCliError } from "../errors.js";

export function registerNewCommand(program: Command): void {
  program
    .command("new")
    .description("Scaffold a new Haptic project")
    .argument("[type]", "Project type: bot | userbot", "bot")
    .argument("[name]", "Project folder name", "my-haptic-project")
    .action(async (type: string, name: string) => {
      const root = path.resolve(process.cwd(), name);
      ensureProjectRootAvailable(root);
      await ensureDir(root);

      const projectType = normalizeProjectType(type);
      const isUserbot = projectType === "userbot";
      const moduleFormat = normalizeModuleFormat("esm");
      const source = isUserbot
        ? `userbot "MyUserbot":\n api_id = env("API_ID")\n api_hash = env("API_HASH")\nend\n\ncommand ping:\n reply "pong"\nend\n\non message match /hello/i:\n reply "hi there"\nend\n`
        : `bot "MyBot":\n token = env("BOT_TOKEN")\nend\n\nfunc greet(name):\n return "hello " + name\nend\n\ncommand start:\n let sample = [user.username]\n for item in sample:\n  log item\n end\n reply await greet(user.username)\nend\n\non message match /ping/i:\n reply "pong"\n console.log("js inline tetap jalan")\nend\n`;
      const engine = isUserbot ? "gramjs" : "telegraf";

      provisionLocalCliBinary(root);
      await writeTextFile(path.join(root, "bot.haptic"), source);
      await writeTextFile(
        path.join(root, "config.hpconf"),
        `{\n  "entry": "bot.haptic",\n  "engine": "${engine}",\n  "moduleFormat": "${moduleFormat}",\n  "outDir": "dist",\n  "cacheDir": ".hpcache",\n  "runtimeMode": "jit",\n  "profile": "testing",\n  "plugins": [],\n  "package": {\n    "name": "${path.basename(root)}",\n    "private": true\n  }\n}\n`,
      );
      await writeTextFile(
        path.join(root, ".env.testing.example"),
        isUserbot
          ? "API_ID=\nAPI_HASH=\nSTRING_SESSION=\n"
          : "BOT_TOKEN=\n",
      );
      await writeTextFile(
        path.join(root, "package.json"),
        `${JSON.stringify(createProjectPackageJson(path.basename(root), engine, { moduleFormat }), null, 2)}\n`,
      );

      process.stdout.write(`Created: ${root}\n`);
    });
}

function ensureProjectRootAvailable(root: string): void {
  if (!fs.existsSync(root)) {
    return;
  }

  const stat = fs.statSync(root);
  if (!stat.isDirectory()) {
    throw new HapticCliError({
      code: "HPTCLI_PROJECT_PATH_INVALID",
      message: `Target path is not a directory: ${root}`,
    });
  }

  const existingEntries = fs.readdirSync(root);
  if (existingEntries.length > 0) {
    throw new HapticCliError({
      code: "HPTCLI_PROJECT_EXISTS",
      message: `Target directory is not empty: ${root}`,
    });
  }
}
