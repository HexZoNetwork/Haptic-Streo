import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const entry = path.join(repoRoot, "packages", "haptic-cli", "dist", "cli.js");
const binDir = path.join(repoRoot, "packages", "haptic", "bin");
const outfile = path.join(binDir, "haptic.cjs");
const legacyOutfile = path.join(binDir, "haptic.js");

run("npm", ["run", "build"]);

if (!fs.existsSync(entry)) {
  process.stderr.write(`CLI entry not found after build: ${entry}\n`);
  process.exit(1);
}

await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node18",
});

const output = fs.readFileSync(outfile, "utf8");
const withoutShebangs = output.replace(/^#!.*\r?\n/gm, "");
fs.writeFileSync(outfile, `#!/usr/bin/env node\n${withoutShebangs}`, "utf8");

if (fs.existsSync(legacyOutfile)) {
  fs.rmSync(legacyOutfile);
}

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
