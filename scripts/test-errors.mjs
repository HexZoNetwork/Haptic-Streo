import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliBin = path.join(repoRoot, "packages", "haptic-cli", "dist", "cli.js");

await testInvalidConfigSnapshot();
await testDuplicateCommandSnapshot();
await testBenchmarkIterationErrorSnapshot();

async function testInvalidConfigSnapshot() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "haptic-test-error-"));
  await fs.writeFile(path.join(tempRoot, "config.hpconf"), "{ invalid json");
  await fs.writeFile(path.join(tempRoot, "bot.haptic"), "command start:\n reply \"ok\"\nend\n");

  const stderr = await captureFailure(process.execPath, [cliBin, "build"], { cwd: tempRoot });
  assert.equal(
    normalize(stderr, tempRoot),
    [
      "Error [HPTCLI_CONFIG_INVALID] Failed to load config: <TMP>\\config.hpconf",
      "Caused by: SyntaxError: Expected property name or '}' in JSON at position 2 (line 1 column 3)",
      "",
    ].join("\n"),
  );
}

async function testDuplicateCommandSnapshot() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "haptic-test-dup-"));
  await fs.writeFile(path.join(tempRoot, "bot.haptic"), "command start:\n reply \"a\"\nend\n\ncommand start:\n reply \"b\"\nend\n");

  const stderr = await captureFailure(process.execPath, [cliBin, "build"], { cwd: tempRoot });
  assert.equal(
    normalize(stderr, tempRoot),
    [
      "Error [HPTCLI_BUILD_FAILED] Build failed for <TMP>\\bot.haptic",
      "Caused by: HPTC_SEMANTIC_DUPLICATE_COMMAND: Duplicate command name: start",
      "",
    ].join("\n"),
  );
}

async function testBenchmarkIterationErrorSnapshot() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "haptic-test-bench-"));
  await fs.writeFile(path.join(tempRoot, "bot.haptic"), "command start:\n reply \"ok\"\nend\n");

  const stderr = await captureFailure(process.execPath, [cliBin, "benchmark", "--iterations", "0"], { cwd: tempRoot });
  assert.equal(
    normalize(stderr, tempRoot),
    [
      "Error [HPTCLI_BENCHMARK_ITERATIONS_INVALID] Invalid iteration count: 0",
      "  - Pass a positive integer to --iterations",
      "",
    ].join("\n"),
  );
}

async function captureFailure(command, args, options) {
  try {
    await run(command, args, options);
  } catch (error) {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  throw new Error("Expected command to fail");
}

function normalize(value, tempRoot) {
  return value
    .replaceAll(tempRoot, "<TMP>")
    .replace(/\r\n/g, "\n");
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
