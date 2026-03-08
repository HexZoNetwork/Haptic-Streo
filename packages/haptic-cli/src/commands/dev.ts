import fs from "node:fs";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import chokidar from "chokidar";
import { ensureDir } from "@haptic/utils";
import type { Command } from "commander";
import { formatCliError, HapticCliError } from "../errors.js";
import {
  compileToRuntimeCache,
  ensureEntryExists,
  ensureRuntimeEnv,
  loadEnvironmentVariables,
  loadProjectConfig,
  resolveCacheDir,
  resolveEntryPath,
} from "./shared.js";

export function registerDevCommand(program: Command): void {
  program
    .command("dev")
    .description("Watch files, JIT recompile, and restart runtime")
    .option("-e, --entry <path>", "Entry .haptic file")
    .option("-c, --config <path>", "Config file (config.hpconf | hptcf.json | haptic.config.js)")
    .option("--monitor", "Write runtime logs to .hpcache/logs", true)
    .option("--no-monitor", "Disable runtime log file")
    .action(async (opts: { entry?: string; config?: string; monitor: boolean }) => {
      const loaded = await loadProjectConfig(opts.config);
      const config = loaded.config;
      const entry = resolveEntryPath(opts.entry, config, loaded.projectRoot);
      ensureEntryExists(entry);
      let proc: ChildProcess | undefined;

      const cacheDir = resolveCacheDir(config, loaded.projectRoot);
      const logDir = path.join(cacheDir, "logs");
      await ensureDir(logDir);

      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const logFile = path.join(logDir, `dev-${ts}.log`);
      const stream = opts.monitor ? fs.createWriteStream(logFile, { flags: "a" }) : undefined;

      if (stream) {
        process.stdout.write(`Monitoring log: ${logFile}\n`);
      }

      const rebuild = async () => {
        const envLoaded = loadEnvironmentVariables(config, loaded.projectRoot);
        ensureRuntimeEnv(config);

        const runtime = await compileToRuntimeCache(entry, config, loaded.projectRoot);
        process.stdout.write(`Runtime updated (jit:${runtime.codeHash})\n`);
        if (envLoaded.loadedPaths.length > 0) {
          process.stdout.write(`Env loaded: ${envLoaded.loadedPaths.join(", ")}\n`);
        }

        if (proc) {
          proc.kill();
        }

        if (!opts.monitor) {
          proc = spawn(process.execPath, [runtime.runtimeFile], { stdio: "inherit" });
          proc.on("error", (error) => {
            process.stderr.write(formatCliError(new HapticCliError({
              code: "HPTCLI_RUNTIME_START_FAILED",
              message: `Failed to start runtime: ${runtime.runtimeFile}`,
              cause: error,
            })));
          });
          return;
        }

        proc = spawn(process.execPath, [runtime.runtimeFile], {
          stdio: ["inherit", "pipe", "pipe"],
        });

        proc.on("error", (error) => {
          process.stderr.write(formatCliError(new HapticCliError({
            code: "HPTCLI_RUNTIME_START_FAILED",
            message: `Failed to start runtime: ${runtime.runtimeFile}`,
            cause: error,
          })));
        });

        proc.stdout?.on("data", (chunk) => {
          process.stdout.write(chunk);
          stream?.write(chunk);
        });

        proc.stderr?.on("data", (chunk) => {
          process.stderr.write(chunk);
          stream?.write(chunk);
        });
      };

      await rebuild();

      const watched = [entry];
      if (loaded.configPath) {
        watched.push(loaded.configPath);
      }
      watched.push(path.resolve(loaded.projectRoot, ".env"));
      if (config.profile) {
        watched.push(path.resolve(loaded.projectRoot, `.env.${config.profile}`));
      }
      if (config.envFile) {
        watched.push(path.resolve(loaded.projectRoot, config.envFile));
      }

      const watcher = chokidar.watch(watched, { ignoreInitial: true });
      watcher.on("all", async () => {
        try {
          await rebuild();
        } catch (error) {
          process.stderr.write(formatCliError(error));
        }
      });

      const shutdown = () => {
        stream?.end();
        proc?.kill();
        process.exit(0);
      };

      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);
    });
}
