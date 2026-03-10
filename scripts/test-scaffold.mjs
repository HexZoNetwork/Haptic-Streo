import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliBin = path.join(repoRoot, "packages", "haptic-cli", "dist", "cli.js");

await testNewScaffoldCreatesSelfContainedProject();
await testNewScaffoldRejectsNonEmptyDirectory();
await testWizardCreatesLocalCliScripts();
await testInvalidScaffoldInputFailsFast();

async function testNewScaffoldCreatesSelfContainedProject() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "haptic-test-new-"));
  const projectRoot = path.join(tempRoot, "demo");

  await run(process.execPath, [cliBin, "new", "bot", "demo"], { cwd: tempRoot });

  const pkg = JSON.parse(await fs.readFile(path.join(projectRoot, "package.json"), "utf8"));
  assert.equal(pkg.scripts.build, "node .haptic/bin/haptic.cjs build");
  assert.equal(pkg.dependencies.telegraf, "^4.16.3");
  assert.equal(await exists(path.join(projectRoot, ".haptic", "bin", "haptic.cjs")), true);

  await run("npm", ["run", "build"], { cwd: projectRoot });
  assert.equal(await exists(path.join(projectRoot, "dist", "bot.mjs")), true);
}

async function testWizardCreatesLocalCliScripts() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "haptic-test-wizard-"));
  await fs.writeFile(path.join(tempRoot, "package.json"), JSON.stringify({ name: "wizard-demo", private: true }, null, 2));

  await run(process.execPath, [cliBin, "wizard", "--yes", "--engine", "telegraf", "--skip-install"], { cwd: tempRoot });

  const pkg = JSON.parse(await fs.readFile(path.join(tempRoot, "package.json"), "utf8"));
  assert.equal(pkg.scripts.dev, "node .haptic/bin/haptic.cjs dev");
  assert.equal(pkg.dependencies.telegraf, "^4.16.3");
  assert.equal(await exists(path.join(tempRoot, ".haptic", "bin", "haptic.cjs")), true);
}

async function testNewScaffoldRejectsNonEmptyDirectory() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "haptic-test-new-existing-"));
  const projectRoot = path.join(tempRoot, "demo");
  await fs.mkdir(projectRoot, { recursive: true });
  await fs.writeFile(path.join(projectRoot, "README.md"), "# existing\n");

  await assert.rejects(
    () => run(process.execPath, [cliBin, "new", "bot", "demo"], { cwd: tempRoot }),
    /Target directory is not empty/,
  );
}

async function testInvalidScaffoldInputFailsFast() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "haptic-test-invalid-"));

  await assert.rejects(
    () => run(process.execPath, [cliBin, "new", "nope", "demo"], { cwd: tempRoot }),
    /Unknown project type: nope/,
  );

  await assert.rejects(
    () => run(process.execPath, [cliBin, "wizard", "--yes", "--engine", "nope", "--skip-install"], { cwd: tempRoot }),
    /Unknown engine: nope/,
  );
}

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }

      reject(new Error(stderr || stdout || `Command failed with code ${code}`));
    });
  });
}

