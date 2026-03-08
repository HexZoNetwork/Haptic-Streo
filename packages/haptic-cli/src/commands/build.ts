import path from "node:path";
import { compileHapticFile } from "@haptic/core";
import type { Command } from "commander";
import { loadEnvironmentVariables, loadProjectConfig, resolveEntryPath } from "./shared.js";

export function registerBuildCommand(program: Command): void {
  program
    .command("build")
    .description("Compile .haptic source into development JavaScript artifact")
    .option("-e, --entry <path>", "Entry .haptic file")
    .option("-c, --config <path>", "Config file (config.hpconf | hptcf.json | haptic.config.js)")
    .action(async (opts: { entry?: string; config?: string }) => {
      const loaded = await loadProjectConfig(opts.config);
      const config = loaded.config;
      const envLoaded = loadEnvironmentVariables(config, loaded.projectRoot);

      const resolvedConfig = {
        ...config,
        outDir: path.resolve(loaded.projectRoot, config.outDir ?? "dist"),
      };

      const entry = resolveEntryPath(opts.entry, resolvedConfig, loaded.projectRoot);
      const result = await compileHapticFile(path.resolve(entry), resolvedConfig);
      process.stdout.write(`Built (dev artifact): ${result.outFile}\n`);
      if (envLoaded.loadedPaths.length > 0) {
        process.stdout.write(`Env loaded: ${envLoaded.loadedPaths.join(", ")}\n`);
      }
    });
}

