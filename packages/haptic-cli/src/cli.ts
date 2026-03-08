#!/usr/bin/env node
import { Command } from "commander";
import { formatCliError, getCliExitCode } from "./errors.js";
import { registerAuthCommand } from "./commands/auth.js";
import { registerBenchmarkCommand } from "./commands/benchmark.js";
import { registerBuildCommand } from "./commands/build.js";
import { registerDevCommand } from "./commands/dev.js";
import { registerDoctorCommand } from "./commands/doctor.js";
import { registerNewCommand } from "./commands/new.js";
import { registerRunCommand } from "./commands/run.js";
import { registerTestCommand } from "./commands/test.js";
import { registerWizardCommand } from "./commands/wizard.js";

const program = new Command();

program.name("haptic").description("Haptic Telegram automation DSL CLI").version("0.1.0");

registerNewCommand(program);
registerAuthCommand(program);
registerBuildCommand(program);
registerRunCommand(program);
registerDevCommand(program);
registerBenchmarkCommand(program);
registerDoctorCommand(program);
registerTestCommand(program);
registerWizardCommand(program);

program.parseAsync(normalizeDirectEntryArgv(process.argv)).catch((error) => {
  process.stderr.write(formatCliError(error));
  process.exit(getCliExitCode(error));
});

function normalizeDirectEntryArgv(argv: string[]): string[] {
  const args = argv.slice(2);
  if (args.length === 0) {
    return argv;
  }

  const firstArg = args[0];
  const knownCommand = new Set(["new", "auth", "build", "run", "dev", "benchmark", "doctor", "test", "wizard"]);
  if (knownCommand.has(firstArg)) {
    return argv;
  }

  if (!firstArg.endsWith(".haptic")) {
    return argv;
  }

  return [...argv.slice(0, 2), "run", "--entry", firstArg, ...args.slice(1)];
}
