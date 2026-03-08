import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, "release", "tarballs");
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

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

run("npm", ["run", "build"]);

for (const pkg of packagesInOrder) {
  run("npm", ["pack", "--workspace", pkg, "--pack-destination", outDir]);
}

process.stdout.write(`Tarballs ready in: ${outDir}\n`);

function run(command, args) {
  process.stdout.write(`run: ${command} ${args.join(" ")}\n`);
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
