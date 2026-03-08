import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const repoRoot = process.cwd();
const tarballDir = path.join(repoRoot, "release", "tarballs");
const installOrder = ["haptic-streo"];

run("npm", ["install"], { skipWhen: () => fs.existsSync(path.join(repoRoot, "node_modules")) });
run("npm", ["run", "pack:tarballs"]);
const tarballs = resolveTarballs(tarballDir, installOrder);
run("npm", ["install", "-g", ...tarballs]);

const globalNodeModules = capture("npm", ["root", "-g"]);
const installedBin = path.join(globalNodeModules, "haptic-streo", "bin", "haptic.cjs");
if (!fs.existsSync(installedBin)) {
  process.stderr.write(`Installed CLI binary not found: ${installedBin}\n`);
  process.exit(1);
}

run("node", [installedBin, "--version"]);

process.stdout.write("Haptic CLI install step completed. Use: haptic --help (restart terminal if PATH is stale)\n");

function run(command, args, options = {}) {
  if (typeof options.skipWhen === "function" && options.skipWhen()) {
    process.stdout.write(`skip: ${command} ${args.join(" ")}\n`);
    return;
  }

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

function capture(command, args) {
  process.stdout.write(`run: ${command} ${args.join(" ")}\n`);
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    shell: true,
  });

  if (result.status !== 0) {
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    process.exit(result.status ?? 1);
  }

  const stdout = result.stdout?.trim();
  if (!stdout) {
    process.stderr.write(`No output from command: ${command} ${args.join(" ")}\n`);
    process.exit(1);
  }

  return stdout;
}

function resolveTarballs(directory, packageNames) {
  const files = fs.existsSync(directory) ? fs.readdirSync(directory) : [];
  const resolved = [];

  for (const packageName of packageNames) {
    const base = packageName.startsWith("@")
      ? packageName.slice(1).replace("/", "-")
      : packageName;
    const pattern = new RegExp(`^${escapeRegExp(base)}-\\d+\\.\\d+\\.\\d+(?:[-+].+)?\\.tgz$`);
    const name = files.find((f) => pattern.test(f));
    if (!name) {
      process.stderr.write(`Missing tarball for package: ${packageName}\n`);
      process.exit(1);
    }
    resolved.push(path.join(directory, name));
  }

  return resolved;
}

function escapeRegExp(value) {
  return value.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

