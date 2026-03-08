#!/usr/bin/env node
import { Command } from "commander";
import { registerBuildCommand } from "./commands/build.js";
import { registerDevCommand } from "./commands/dev.js";
import { registerNewCommand } from "./commands/new.js";
import { registerRunCommand } from "./commands/run.js";
const program = new Command();
program.name("haptic").description("Haptic Telegram automation DSL CLI").version("0.1.0");
registerNewCommand(program);
registerBuildCommand(program);
registerRunCommand(program);
registerDevCommand(program);
program.parseAsync(process.argv).catch((error) => {
    process.stderr.write(`${String(error)}\n`);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map