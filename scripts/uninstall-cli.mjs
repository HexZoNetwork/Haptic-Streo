import { spawnSync } from "node:child_process";
import process from "node:process";

const commands = [
  [
      "npm",
      [
        "uninstall",
        "-g",
        "haptic-streo",
      ],
  ],
];

for (const [cmd, args] of commands) {
  process.stdout.write(`run: ${cmd} ${args.join(" ")}\n`);
  const result = spawnSync(cmd, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

process.stdout.write("Haptic CLI uninstalled from global npm links.\n");
