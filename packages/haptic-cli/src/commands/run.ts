import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { ensureDir } from "@haptic/utils";
import type { Command } from "commander";
import {
  compileToRuntimeCache,
  loadEnvironmentVariables,
  loadProjectConfig,
  resolveCacheDir,
  resolveEntryPath,
  validateRuntimeEnv,
} from "./shared.js";

export function registerRunCommand(program: Command): void {
  program
    .command("run")
    .description("JIT compile and run Haptic project from .hpcache")
    .option("-e, --entry <path>", "Entry .haptic file")
    .option("-c, --config <path>", "Config file (config.hpconf | hptcf.json | haptic.config.js)")
    .option("--monitor", "Write runtime logs to .hpcache/logs", true)
    .option("--no-monitor", "Disable runtime log file")
    .action(async (opts: { entry?: string; config?: string; monitor: boolean }) => {
      const loaded = await loadProjectConfig(opts.config);
      const config = loaded.config;
      const entry = resolveEntryPath(opts.entry, config, loaded.projectRoot);

      const envLoaded = loadEnvironmentVariables(config, loaded.projectRoot);
      const missing = validateRuntimeEnv(config);
      if (missing.length > 0) {
        throw new Error(`Missing required env vars: ${missing.join(", ")}. Configure in .env / config.hpconf profile.`);
      }

      const runtime = await compileToRuntimeCache(entry, config, loaded.projectRoot);
      process.stdout.write(`Runtime prepared (jit:${runtime.codeHash})\n`);
      if (envLoaded.loadedPaths.length > 0) {
        process.stdout.write(`Env loaded: ${envLoaded.loadedPaths.join(", ")}\n`);
      }

      if (!opts.monitor) {
        const child = spawn(process.execPath, [runtime.runtimeFile], { stdio: "inherit" });
        child.on("exit", (code) => process.exit(code ?? 0));
        return;
      }

      const cacheDir = resolveCacheDir(config, loaded.projectRoot);
      const logDir = path.join(cacheDir, "logs");
      await ensureDir(logDir);

      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const logFile = path.join(logDir, `run-${ts}.log`);
      const stream = fs.createWriteStream(logFile, { flags: "a" });

      process.stdout.write(`Monitoring log: ${logFile}\n`);

      const child = spawn(process.execPath, [runtime.runtimeFile], {
        stdio: ["inherit", "pipe", "pipe"],
      });

      child.stdout?.on("data", (chunk) => {
        process.stdout.write(chunk);
        stream.write(chunk);
      });

      child.stderr?.on("data", (chunk) => {
        process.stderr.write(chunk);
        stream.write(chunk);
      });

      child.on("exit", (code) => {
        stream.end();
        process.exit(code ?? 0);
      });
    });
}

