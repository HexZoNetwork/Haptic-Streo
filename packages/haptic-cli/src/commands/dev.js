import path from "node:path";
import { spawn } from "node:child_process";
import chokidar from "chokidar";
import { compileHapticFile } from "@haptic/core";
import { loadProjectConfig } from "./shared.js";
export function registerDevCommand(program) {
    program
        .command("dev")
        .description("Watch files, rebuild, and restart runtime")
        .option("-e, --entry <path>", "Entry .haptic file")
        .option("-c, --config <path>", "Config file", "haptic.config.js")
        .action(async (opts) => {
        const config = await loadProjectConfig(opts.config);
        const entry = path.resolve(process.cwd(), opts.entry ?? config.entry ?? "bot.haptic");
        let proc;
        const rebuild = async () => {
            const result = await compileHapticFile(entry, config);
            process.stdout.write(`Built: ${result.outFile}\n`);
            if (proc) {
                proc.kill();
            }
            proc = spawn(process.execPath, [result.outFile], { stdio: "inherit" });
        };
        await rebuild();
        const watcher = chokidar.watch([entry, opts.config], { ignoreInitial: true });
        watcher.on("all", async () => {
            try {
                await rebuild();
            }
            catch (error) {
                process.stderr.write(`${String(error)}\n`);
            }
        });
    });
}
//# sourceMappingURL=dev.js.map