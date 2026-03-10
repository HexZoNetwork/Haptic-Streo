import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliBin = path.join(repoRoot, "packages", "haptic-cli", "dist", "cli.js");

await testSingleFileTransformAndSync();
await testDirectoryTransformSkipsHiddenAndNodeModules();

async function testSingleFileTransformAndSync() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "haptic-test-transform-file-"));
  await fs.writeFile(
    path.join(tempRoot, "bot.js"),
    [
      'import { Telegraf } from "telegraf";',
      "const bot = new Telegraf(process.env.BOT_TOKEN);",
      "",
      'bot.command("start", async (ctx) => {',
      '  await ctx.reply("hi");',
      "});",
      "",
      "bot.launch();",
      "",
    ].join("\n"),
  );
  await fs.writeFile(
    path.join(tempRoot, "config.hpconf"),
    JSON.stringify({
      entry: "bot.js",
      engine: "telegraf",
      moduleFormat: "cjs",
      profile: "testing",
      package: {
        description: "legacy-js-project",
      },
    }, null, 2),
  );
  await fs.writeFile(
    path.join(tempRoot, "package.json"),
    JSON.stringify({ name: "legacy-js-project", dependencies: { telegram: "^2.0.0" } }, null, 2),
  );

  await run(process.execPath, [cliBin, "transform", "bot.js"], { cwd: tempRoot });

  const transformed = await fs.readFile(path.join(tempRoot, "bot.haptic"), "utf8");
  assert.match(transformed, /bot "bot":/);
  assert.match(transformed, /token = env\("BOT_TOKEN"\)/);
  assert.match(transformed, /command start:/);
  assert.match(transformed, /reply "hi"/);

  const config = JSON.parse(await fs.readFile(path.join(tempRoot, "config.hpconf"), "utf8"));
  assert.equal(config.entry, "bot.haptic");
  assert.equal(config.engine, "telegraf");

  const pkg = JSON.parse(await fs.readFile(path.join(tempRoot, "package.json"), "utf8"));
  assert.equal(pkg.dependencies.telegraf, "^4.16.3");
  assert.equal(pkg.dependencies.telegram, undefined);
  assert.equal(pkg.scripts.build, "node .haptic/bin/haptic.cjs build");
  assert.equal(pkg.type, "commonjs");
  assert.equal(pkg.main, "dist/bot.cjs");
  assert.equal(pkg.description, "legacy-js-project");
}

async function testDirectoryTransformSkipsHiddenAndNodeModules() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "haptic-test-transform-dir-"));
  await fs.mkdir(path.join(tempRoot, "src"), { recursive: true });
  await fs.mkdir(path.join(tempRoot, ".cache"), { recursive: true });
  await fs.mkdir(path.join(tempRoot, "node_modules", "pkg"), { recursive: true });

  await fs.writeFile(
    path.join(tempRoot, "src", "ping.js"),
    ['console.log("plain js");', ""].join("\n"),
  );
  await fs.writeFile(path.join(tempRoot, ".cache", "skip.js"), 'console.log("skip");\n');
  await fs.writeFile(path.join(tempRoot, "node_modules", "pkg", "skip.js"), 'console.log("skip");\n');

  await run(process.execPath, [cliBin, "transform", "."], { cwd: tempRoot });

  const transformed = await fs.readFile(path.join(tempRoot, "src", "ping.haptic"), "utf8");
  assert.match(transformed, /console\.log\("plain js"\);/);

  await assert.rejects(fs.access(path.join(tempRoot, ".cache", "skip.haptic")));
  await assert.rejects(fs.access(path.join(tempRoot, "node_modules", "pkg", "skip.haptic")));
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
