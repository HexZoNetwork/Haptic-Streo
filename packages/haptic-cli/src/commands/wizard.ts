import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import process from "node:process";
import { ensureDir, writeTextFile } from "@haptic/utils";
import type { Command } from "commander";
import {
  createProjectPackageJson,
  dependencyForEngine,
  type HapticEngine,
  normalizeEngine,
  provisionLocalCliBinary,
} from "./scaffold-shared.js";

interface WizardOptions {
  yes?: boolean;
  engine?: HapticEngine;
  entry?: string;
  profile?: string;
  skipInstall?: boolean;
}

export function registerWizardCommand(program: Command): void {
  program
    .command("wizard")
    .description("Interactive project wizard: config.hpconf, env profile, scripts, and deps")
    .option("-y, --yes", "Use defaults without prompts")
    .option("--engine <engine>", "telegraf | gramjs")
    .option("--entry <path>", "Entry .haptic file")
    .option("--profile <name>", "Env profile name", "testing")
    .option("--skip-install", "Skip npm dependency installation", false)
    .action(async (opts: WizardOptions) => {
      const rl = createInterface({ input: process.stdin, output: process.stdout });

      try {
        const engine = await resolveEngine(rl, opts);
        const entry = opts.entry ?? (await ask(rl, "Entry file", "bot.haptic", opts.yes));
        const profile = opts.profile ?? "testing";

        await ensureDir(process.cwd());

        const configPath = path.resolve(process.cwd(), "config.hpconf");
        const envPath = path.resolve(process.cwd(), `.env.${profile}`);
        const envExamplePath = path.resolve(process.cwd(), `.env.${profile}.example`);
        const entryPath = path.resolve(process.cwd(), entry);

        const config = {
          entry,
          engine,
          outDir: "dist",
          cacheDir: ".hpcache",
          runtimeMode: "jit",
          profile,
          plugins: [],
        };

        provisionLocalCliBinary(process.cwd());
        await writeTextFile(configPath, `${JSON.stringify(config, null, 2)}\n`);

        if (!fs.existsSync(envPath)) {
          await writeTextFile(envPath, engine === "gramjs" ? "API_ID=\nAPI_HASH=\nSTRING_SESSION=\n" : "BOT_TOKEN=\n");
        }

        await writeTextFile(
          envExamplePath,
          engine === "gramjs" ? "API_ID=\nAPI_HASH=\nSTRING_SESSION=\n" : "BOT_TOKEN=\n",
        );

        if (!fs.existsSync(entryPath)) {
          await ensureDir(path.dirname(entryPath));
          await writeTextFile(entryPath, defaultHapticTemplate(engine));
        }

        await upsertPackageJson(engine);

        if (!opts.skipInstall) {
          const engineDependency = dependencyForEngine(engine);
          process.stdout.write(`Installing project dependencies for ${engineDependency.packageName}\n`);
          const install = spawnSync("npm", ["install"], {
            cwd: process.cwd(),
            stdio: "inherit",
            shell: true,
          });

          if (install.status !== 0) {
            process.stdout.write("Dependency installation failed; run manually with npm install.\n");
          }
        }

        process.stdout.write(`Wizard completed.\n- Config: ${configPath}\n- Env: ${envPath}\n- Entry: ${entryPath}\n`);
      } finally {
        rl.close();
      }
    });
}

function defaultHapticTemplate(engine: HapticEngine): string {
  if (engine === "gramjs") {
    return `userbot "MyUserbot":\n api_id = env("API_ID")\n api_hash = env("API_HASH")\nend\n\ncommand ping:\n reply "pong"\nend\n`;
  }

  return `bot "MyBot":\n token = env("BOT_TOKEN")\nend\n\ncommand start:\n reply "hello " + user.username\nend\n`;
}

async function upsertPackageJson(engine: HapticEngine): Promise<void> {
  const packagePath = path.resolve(process.cwd(), "package.json");
  const hasPackage = fs.existsSync(packagePath);

  const base = hasPackage
    ? (JSON.parse(fs.readFileSync(packagePath, "utf8")) as Record<string, unknown>)
    : ({ name: path.basename(process.cwd()) || "haptic-project", private: true, type: "module" } as Record<string, unknown>);

  const packageName = typeof base.name === "string" && base.name.trim() !== ""
    ? base.name
    : (path.basename(process.cwd()) || "haptic-project");
  const template = createProjectPackageJson(packageName, engine);

  base.private = base.private ?? true;
  base.type = base.type ?? "module";
  base.scripts = {
    ...(template.scripts as Record<string, string>),
    ...((base.scripts as Record<string, string> | undefined) ?? {}),
  };
  base.dependencies = {
    ...(template.dependencies as Record<string, string>),
    ...((base.dependencies as Record<string, string> | undefined) ?? {}),
  };

  await writeTextFile(packagePath, `${JSON.stringify(base, null, 2)}\n`);
}

async function resolveEngine(
  rl: ReturnType<typeof createInterface>,
  opts: WizardOptions,
): Promise<HapticEngine> {
  if (typeof opts.engine === "string") {
    return normalizeEngine(opts.engine);
  }

  const answer = await ask(rl, "Engine (telegraf/gramjs)", "telegraf", opts.yes);
  return normalizeEngine(answer);
}

async function ask(
  rl: ReturnType<typeof createInterface>,
  prompt: string,
  defaultValue: string,
  yes?: boolean,
): Promise<string> {
  if (yes) {
    return defaultValue;
  }

  const raw = await rl.question(`${prompt} [${defaultValue}]: `);
  const v = raw.trim();
  return v || defaultValue;
}
