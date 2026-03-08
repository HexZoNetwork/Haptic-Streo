import { spawn, type ChildProcess } from "node:child_process";
import type { Command } from "commander";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import {
  compileToRuntimeCache,
  loadEnvironmentVariables,
  loadProjectConfig,
  resolveEntryPath,
} from "./shared.js";

export function registerTestCommand(program: Command): void {
  const test = program.command("test").description("End-to-end testing helpers");

  test
    .command("e2e")
    .description("Start bot runtime, send Telegram message from user account, and capture reply")
    .requiredOption("--bot-config <path>", "Bot config path (config.hpconf or hptcf.json)")
    .requiredOption("--user-config <path>", "Userbot config path (config.hpconf or hptcf.json)")
    .requiredOption("--target <username>", "Bot username, e.g. Hxzoubot")
    .option("--message <text>", "Message to send", "/start")
    .option("--bot-entry <path>", "Override bot entry .haptic")
    .option("--boot-ms <number>", "Wait time before sending test message", "5000")
    .option("--timeout-ms <number>", "Max wait for reply", "25000")
    .option("--verbose", "Print bot runtime stdout/stderr", false)
    .action(
      async (opts: {
        botConfig: string;
        userConfig: string;
        target: string;
        message: string;
        botEntry?: string;
        bootMs: string;
        timeoutMs: string;
        verbose: boolean;
      }) => {
        const bootMs = Math.max(0, Number.parseInt(opts.bootMs, 10) || 5000);
        const timeoutMs = Math.max(1000, Number.parseInt(opts.timeoutMs, 10) || 25000);

        const botLoaded = await loadProjectConfig(opts.botConfig);
        const userLoaded = await loadProjectConfig(opts.userConfig);
        const botConfig = botLoaded.config;
        const userConfig = userLoaded.config;

        loadEnvironmentVariables(botConfig, botLoaded.projectRoot);
        const missingBot = ["BOT_TOKEN"].filter((key) => !process.env[key]);
        if (missingBot.length > 0) {
          throw new Error(`Missing bot env vars: ${missingBot.join(", ")}`);
        }

        const botEntry = resolveEntryPath(opts.botEntry, botConfig, botLoaded.projectRoot);
        const runtime = await compileToRuntimeCache(botEntry, botConfig, botLoaded.projectRoot);

        const botProc = startBotProcess(runtime.runtimeFile, opts.verbose);

        try {
          await sleep(bootMs);
          if (botProc.exitCode !== null) {
            throw new Error(`Bot runtime exited early with code ${botProc.exitCode}`);
          }

          loadEnvironmentVariables(userConfig, userLoaded.projectRoot);
          const missingUser = ["API_ID", "API_HASH", "STRING_SESSION"].filter((key) => !process.env[key]);
          if (missingUser.length > 0) {
            throw new Error(`Missing user env vars: ${missingUser.join(", ")}`);
          }

          const apiId = Number(process.env.API_ID);
          const apiHash = String(process.env.API_HASH);
          const stringSession = String(process.env.STRING_SESSION);

          const client = new TelegramClient(new StringSession(stringSession), apiId, apiHash, {
            connectionRetries: 5,
          });

          const target = opts.target.replace(/^@/, "");

          try {
            await client.connect();
            const me = await client.getMe();
            const peer = await client.getEntity(target);
            const sentAt = Math.floor(Date.now() / 1000);

            await client.sendMessage(peer, { message: opts.message });

            const deadline = Date.now() + timeoutMs;
            let reply: string | null = null;
            let replyDate: number | undefined;

            while (Date.now() < deadline) {
              const messages = await client.getMessages(peer, { limit: 30 });
              const incoming = messages.find((msg) => !msg.out && Number(msg.date) >= sentAt);
              if (incoming) {
                reply = String(incoming.message ?? "");
                replyDate = Number(incoming.date);
                break;
              }

              await sleep(1000);
            }

            if (!reply) {
              throw new Error(`No bot reply captured within ${timeoutMs}ms`);
            }

            process.stdout.write(
              `${JSON.stringify(
                {
                  account: (me as unknown as { username?: string; firstName?: string }).username,
                  target: `@${target}`,
                  sent: opts.message,
                  reply,
                  replyDate,
                },
                null,
                2,
              )}\n`,
            );
          } finally {
            await client.disconnect();
          }
        } finally {
          stopBotProcess(botProc);
        }
      },
    );
}

function startBotProcess(runtimeFile: string, verbose: boolean): ChildProcess {
  const proc = spawn(process.execPath, [runtimeFile], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (verbose) {
    proc.stdout?.on("data", (chunk) => process.stdout.write(`[bot] ${chunk}`));
    proc.stderr?.on("data", (chunk) => process.stderr.write(`[bot-err] ${chunk}`));
  }

  return proc;
}

function stopBotProcess(proc: ChildProcess): void {
  if (proc.exitCode === null) {
    proc.kill("SIGTERM");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

