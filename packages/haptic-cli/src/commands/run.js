import path from "node:path";
import { spawn } from "node:child_process";
import { compileHapticFile } from "@haptic/core";
import { loadProjectConfig } from "./shared.js";
export function registerRunCommand(program) {
    program
        .command("run")
        .description("Compile and run Haptic project")
        .option("-e, --entry <path>", "Entry .haptic file")
        .option("-c, --config <path>", "Config file", "haptic.config.js")
        .action(async (opts) => {
        const config = await loadProjectConfig(opts.config);
        const entry = path.resolve(process.cwd(), opts.entry ?? config.entry ?? "bot.haptic");
        const result = await compileHapticFile(entry, config);
        process.stdout.write(`Built: ${result.outFile}\n`);
        const child = spawn(process.execPath, [result.outFile], { stdio: "inherit" });
        child.on("exit", (code) => process.exit(code ?? 0));
    });
}
//# sourceMappingURL=run.js.map