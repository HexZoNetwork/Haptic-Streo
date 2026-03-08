import fs from "node:fs";
import type { Command } from "commander";
import {
  compileToRuntimeCache,
  loadEnvironmentVariables,
  loadProjectConfig,
  resolveEntryPath,
  validateRuntimeEnv,
} from "./shared.js";

export function registerDoctorCommand(program: Command): void {
  program
    .command("doctor")
    .description("Validate config, env credentials, and compile health")
    .option("-e, --entry <path>", "Entry .haptic file")
    .option("-c, --config <path>", "Config file (config.hpconf | hptcf.json | haptic.config.js)")
    .action(async (opts: { entry?: string; config?: string }) => {
      const loaded = await loadProjectConfig(opts.config);
      const config = loaded.config;
      const entry = resolveEntryPath(opts.entry, config, loaded.projectRoot);

      const envResult = loadEnvironmentVariables(config, loaded.projectRoot);
      const missing = validateRuntimeEnv(config);

      process.stdout.write(`Config: ${loaded.configPath ?? "(default)"}\n`);
      process.stdout.write(`Entry: ${entry}\n`);
      process.stdout.write(`Engine: ${config.engine ?? "telegraf"}\n`);
      process.stdout.write(
        `Env files: ${envResult.loadedPaths.length > 0 ? envResult.loadedPaths.join(", ") : "none"}\n`,
      );

      if (!fs.existsSync(entry)) {
        throw new Error(`Entry file not found: ${entry}`);
      }

      if (missing.length > 0) {
        throw new Error(`Missing required env vars: ${missing.join(", ")}`);
      }

      const runtime = await compileToRuntimeCache(entry, config, loaded.projectRoot);
      process.stdout.write(`Compile: OK (jit:${runtime.codeHash})\n`);
      process.stdout.write(`Runtime cache: ${runtime.runtimeFile}\n`);
      process.stdout.write("Doctor: healthy\n");
    });
}

