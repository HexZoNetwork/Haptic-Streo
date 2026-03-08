import path from "node:path";
import { ensureDir, writeTextFile } from "@haptic/utils";
import type { Command } from "commander";

export function registerNewCommand(program: Command): void {
  program
    .command("new")
    .description("Scaffold a new Haptic project")
    .argument("[type]", "Project type: bot | userbot", "bot")
    .argument("[name]", "Project folder name", "my-haptic-project")
    .action(async (type: string, name: string) => {
      const root = path.resolve(process.cwd(), name);
      await ensureDir(root);

      const isUserbot = type === "userbot";
      const source = isUserbot
        ? `userbot "MyUserbot":\n api_id = env("API_ID")\n api_hash = env("API_HASH")\nend\n\ncommand ping:\n reply "pong"\nend\n\non message match /hello/i:\n reply "hi there"\nend\n`
        : `bot "MyBot":\n token = env("BOT_TOKEN")\nend\n\nfunc greet(name):\n return "hello " + name\nend\n\ncommand start:\n let sample = [user.username]\n for item in sample:\n  log item\n end\n reply await greet(user.username)\nend\n\non message match /ping/i:\n reply "pong"\n console.log("js inline tetap jalan")\nend\n`;
      const engine = isUserbot ? "gramjs" : "telegraf";

      await writeTextFile(path.join(root, "bot.haptic"), source);
      await writeTextFile(
        path.join(root, "config.hpconf"),
        `{\n  "entry": "bot.haptic",\n  "engine": "${engine}",\n  "outDir": "dist",\n  "cacheDir": ".hpcache",\n  "runtimeMode": "jit",\n  "profile": "testing",\n  "plugins": []\n}\n`,
      );
      await writeTextFile(
        path.join(root, ".env.testing.example"),
        isUserbot
          ? "API_ID=\nAPI_HASH=\nSTRING_SESSION=\n"
          : "BOT_TOKEN=\n",
      );
      await writeTextFile(
        path.join(root, "package.json"),
        '{\n  "name": "my-haptic-project",\n  "private": true,\n  "type": "module",\n  "scripts": {\n    "dev": "haptic dev",\n    "build": "haptic build",\n    "run": "haptic run",\n    "doctor": "haptic doctor",\n    "benchmark": "haptic benchmark"\n  }\n}\n',
      );

      process.stdout.write(`Created: ${root}\n`);
    });
}
