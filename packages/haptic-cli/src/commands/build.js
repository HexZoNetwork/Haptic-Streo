import path from "node:path";
import { compileHapticFile } from "@haptic/core";
import { loadProjectConfig } from "./shared.js";
export function registerBuildCommand(program) {
    program
        .command("build")
        .description("Compile .haptic source into JavaScript")
        .option("-e, --entry <path>", "Entry .haptic file")
        .option("-c, --config <path>", "Config file", "haptic.config.js")
        .action(async (opts) => {
        const config = await loadProjectConfig(opts.config);
        const entry = path.resolve(process.cwd(), opts.entry ?? config.entry ?? "bot.haptic");
        const result = await compileHapticFile(entry, config);
        process.stdout.write(`Built: ${result.outFile}\n`);
    });
}
//# sourceMappingURL=build.js.map