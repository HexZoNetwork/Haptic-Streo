import { performance } from "node:perf_hooks";
import { HapticCompiler } from "@haptic/core";
import { readTextFile } from "@haptic/utils";
import type { Command } from "commander";
import { HapticCliError } from "../errors.js";
import { ensureEntryExists, loadEnvironmentVariables, loadProjectConfig, resolveEntryPath } from "./shared.js";

export function registerBenchmarkCommand(program: Command): void {
  program
    .command("benchmark")
    .description("Benchmark compile pipeline (parse + transpile)")
    .option("-e, --entry <path>", "Entry .haptic file")
    .option("-c, --config <path>", "Config file (config.hpconf | hptcf.json | haptic.config.js)")
    .option("-n, --iterations <number>", "Number of iterations", "50")
    .action(async (opts: { entry?: string; config?: string; iterations: string }) => {
      const loaded = await loadProjectConfig(opts.config);
      const config = loaded.config;
      loadEnvironmentVariables(config, loaded.projectRoot);

      const entry = resolveEntryPath(opts.entry, config, loaded.projectRoot);
      ensureEntryExists(entry);

      const source = await readTextFile(entry);
      const compiler = new HapticCompiler(config);

      const parsedIterations = Number.parseInt(opts.iterations, 10);
      if (!Number.isFinite(parsedIterations) || parsedIterations <= 0) {
        throw new HapticCliError({
          code: "HPTCLI_BENCHMARK_ITERATIONS_INVALID",
          message: `Invalid iteration count: ${opts.iterations}`,
          details: ["Pass a positive integer to --iterations"],
        });
      }

      const iterations = parsedIterations;
      const timings: number[] = [];

      await compiler.compileSource(source);

      for (let i = 0; i < iterations; i += 1) {
        const t0 = performance.now();
        await compiler.compileSource(source);
        timings.push(performance.now() - t0);
      }

      timings.sort((a, b) => a - b);
      const avg = timings.reduce((acc, v) => acc + v, 0) / timings.length;
      const p50 = percentile(timings, 0.5);
      const p95 = percentile(timings, 0.95);
      const min = timings[0];
      const max = timings[timings.length - 1];

      process.stdout.write(`Benchmark (${iterations} iter)\n`);
      process.stdout.write(
        `avg=${avg.toFixed(2)}ms p50=${p50.toFixed(2)}ms p95=${p95.toFixed(2)}ms min=${min.toFixed(2)}ms max=${max.toFixed(2)}ms\n`,
      );
    });
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) {
    return 0;
  }

  const idx = Math.min(values.length - 1, Math.max(0, Math.floor(values.length * ratio)));
  return values[idx];
}
