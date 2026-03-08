import { spawnSync } from "node:child_process";
import process from "node:process";

const isDryRun = process.argv.includes("--dry-run");
const packagesInOrder = [
  "@haptic/ast",
  "@haptic/utils",
  "@haptic/parser",
  "@haptic/transpiler",
  "@haptic/plugin-system",
  "@haptic/runtime",
  "@haptic/core",
  "@haptic/ai",
  "@haptic/cli",
  "haptic-streo",
];

for (const pkg of packagesInOrder) {
  const args = ["publish", "--workspace", pkg, "--access", "public"];
  if (isDryRun) {
    args.push("--dry-run");
  }
  run("npm", args);
}

process.stdout.write(isDryRun ? "Dry-run publish completed.\n" : "Publish completed.\n");

function run(command, args) {
  process.stdout.write(`run: ${command} ${args.join(" ")}\n`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
