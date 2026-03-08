import { createInterface } from "node:readline/promises";
import process from "node:process";
import type { Command } from "commander";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { HapticCliError } from "../errors.js";
import {
  ensureRuntimeEnv,
  loadEnvironmentVariables,
  loadProjectConfig,
  resolveEnvTargetPath,
  upsertEnvVariable,
} from "./shared.js";

export function registerAuthCommand(program: Command): void {
  const auth = program.command("auth").description("Authentication helpers for Telegram testing");

  auth
    .command("login")
    .description("Login userbot via terminal and save STRING_SESSION to env file")
    .option("-c, --config <path>", "Config file (config.hpconf | hptcf.json | haptic.config.js)")
    .option("--phone <number>", "Phone number with country code (example: +628123)")
    .option("--code <otp>", "Telegram login code (optional; can be prompted)")
    .option("--password <pwd>", "2FA password (optional; can be prompted)")
    .option("--env-file <path>", "Override target env file to save STRING_SESSION")
    .action(
      async (opts: {
        config?: string;
        phone?: string;
        code?: string;
        password?: string;
        envFile?: string;
      }) => {
        const loaded = await loadProjectConfig(opts.config);
        const config = {
          ...loaded.config,
          engine: "gramjs" as const,
          envFile: opts.envFile ?? loaded.config.envFile,
        };

        loadEnvironmentVariables(config, loaded.projectRoot);
        ensureRuntimeEnv(config);

        const rl = createInterface({ input: process.stdin, output: process.stdout });
        try {
          const phone = opts.phone?.trim() || (await rl.question("Phone number (+countrycode): ")).trim();
          if (!phone) {
            throw new HapticCliError({
              code: "HPTCLI_AUTH_PHONE_REQUIRED",
              message: "Phone number is required.",
            });
          }

          let codeInput = opts.code?.trim();
          let passwordInput = opts.password ?? "";

          const apiId = Number(process.env.API_ID);
          const apiHash = String(process.env.API_HASH);
          const stringSession = new StringSession(process.env.STRING_SESSION ?? "");

          const client = new TelegramClient(stringSession, apiId, apiHash, {
            connectionRetries: 5,
          });

          await client.start({
            phoneNumber: async () => phone,
            phoneCode: async () => {
              if (!codeInput) {
                codeInput = (await rl.question("Telegram code: ")).trim();
              }
              return codeInput;
            },
            password: async () => {
              if (!passwordInput) {
                passwordInput = (await rl.question("2FA password (leave blank if none): ")).trim();
              }
              return passwordInput;
            },
            onError: (err) => {
              throw new HapticCliError({
                code: "HPTCLI_AUTH_LOGIN_FAILED",
                message: "Telegram login failed.",
                cause: err,
              });
            },
          });

          const session = client.session.save();
          const sessionString = typeof session === "string" ? session : String(session);

          const targetEnvPath = resolveEnvTargetPath(config, loaded.projectRoot);
          await upsertEnvVariable(targetEnvPath, "STRING_SESSION", sessionString);

          process.stdout.write(`Login success. STRING_SESSION saved to ${targetEnvPath}\n`);
          await client.disconnect();
        } finally {
          rl.close();
        }
      },
    );
}
