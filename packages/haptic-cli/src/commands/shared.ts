import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { HapticCompiler, type CompilerConfig } from "@haptic/core";
import { ensureDir, readTextFile, writeTextFile } from "@haptic/utils";
import { HapticCliError } from "../errors.js";

export interface CliProjectConfig extends CompilerConfig {
  entry?: string;
  cacheDir?: string;
  runtimeMode?: "jit" | "build";
  envFile?: string;
  profile?: string;
  package?: Record<string, unknown>;
}

export interface LoadedProjectConfig {
  config: CliProjectConfig;
  configPath?: string;
  projectRoot: string;
}

export interface RuntimeCompileResult {
  runtimeFile: string;
  codeHash: string;
}

export interface EnvLoadResult {
  loadedPaths: string[];
}

export async function loadProjectConfig(
  explicitConfigPath?: string,
  cwd = process.cwd(),
): Promise<LoadedProjectConfig> {
  if (explicitConfigPath) {
    const resolved = path.resolve(cwd, explicitConfigPath);
    if (!fs.existsSync(resolved)) {
      throw new HapticCliError({
        code: "HPTCLI_CONFIG_NOT_FOUND",
        message: `Config file not found: ${resolved}`,
      });
    }

    const loaded = await loadConfigByPath(resolved);
    return {
      config: loaded,
      configPath: resolved,
      projectRoot: path.dirname(resolved),
    };
  }

  const hpconfPath = path.resolve(cwd, "config.hpconf");
  const hpconfConfig = await loadOptionalConfigByPath(hpconfPath);
  if (hpconfConfig) {
    return { config: hpconfConfig, configPath: hpconfPath, projectRoot: path.dirname(hpconfPath) };
  }

  const hptcfPath = path.resolve(cwd, "hptcf.json");
  const hptcfConfig = await loadOptionalConfigByPath(hptcfPath);
  if (hptcfConfig) {
    return { config: hptcfConfig, configPath: hptcfPath, projectRoot: path.dirname(hptcfPath) };
  }

  const legacyPath = path.resolve(cwd, "haptic.config.js");
  const legacyConfig = await loadOptionalConfigByPath(legacyPath);
  if (legacyConfig) {
    return { config: legacyConfig, configPath: legacyPath, projectRoot: path.dirname(legacyPath) };
  }

  return { config: {}, projectRoot: cwd };
}

export function resolveEntryPath(entry: string | undefined, config: CliProjectConfig, cwd = process.cwd()): string {
  return path.resolve(cwd, entry ?? config.entry ?? "bot.haptic");
}

export function ensureEntryExists(entryPath: string): void {
  if (!fs.existsSync(entryPath)) {
    throw new HapticCliError({
      code: "HPTCLI_ENTRY_NOT_FOUND",
      message: `Entry file not found: ${entryPath}`,
      details: ["Pass --entry <path> or set entry in config.hpconf"],
    });
  }
}

export function resolveCacheDir(config: CliProjectConfig, cwd = process.cwd()): string {
  return path.resolve(cwd, config.cacheDir ?? ".hpcache");
}

export function resolveEnvTargetPath(config: CliProjectConfig, cwd = process.cwd()): string {
  if (config.envFile) {
    return path.resolve(cwd, config.envFile);
  }

  if (config.profile) {
    return path.resolve(cwd, `.env.${config.profile}`);
  }

  return path.resolve(cwd, ".env");
}

export function loadEnvironmentVariables(config: CliProjectConfig, cwd = process.cwd()): EnvLoadResult {
  const loadedPaths: string[] = [];

  const baseEnvPath = path.resolve(cwd, ".env");
  if (fs.existsSync(baseEnvPath)) {
    dotenv.config({ path: baseEnvPath, override: false });
    loadedPaths.push(baseEnvPath);
  }

  if (config.profile) {
    const profiled = path.resolve(cwd, `.env.${config.profile}`);
    if (fs.existsSync(profiled)) {
      dotenv.config({ path: profiled, override: true });
      loadedPaths.push(profiled);
    }
  }

  if (config.envFile) {
    const explicit = path.resolve(cwd, config.envFile);
    if (fs.existsSync(explicit)) {
      dotenv.config({ path: explicit, override: true });
      if (!loadedPaths.includes(explicit)) {
        loadedPaths.push(explicit);
      }
    }
  }

  return { loadedPaths };
}

export function validateRuntimeEnv(config: CliProjectConfig): string[] {
  const engine = config.engine ?? "telegraf";

  if (engine === "gramjs") {
    return ["API_ID", "API_HASH"].filter((key) => !process.env[key]);
  }

  return ["BOT_TOKEN"].filter((key) => !process.env[key]);
}

export function ensureRuntimeEnv(config: CliProjectConfig): void {
  const missing = validateRuntimeEnv(config);
  if (missing.length === 0) {
    return;
  }

  throw new HapticCliError({
    code: "HPTCLI_ENV_MISSING",
    message: `Missing required env vars: ${missing.join(", ")}`,
    details: [
      `Engine: ${config.engine ?? "telegraf"}`,
      "Configure credentials in .env, .env.<profile>, or config-selected envFile",
    ],
  });
}

export async function upsertEnvVariable(
  envFilePath: string,
  key: string,
  value: string,
): Promise<void> {
  const dir = path.dirname(envFilePath);
  await ensureDir(dir);

  const current = fs.existsSync(envFilePath) ? await readTextFile(envFilePath) : "";
  const lines = current.split(/\r?\n/);
  let replaced = false;

  const updated = lines.map((line) => {
    if (line.startsWith(`${key}=`)) {
      replaced = true;
      return `${key}=${value}`;
    }

    return line;
  });

  if (!replaced) {
    if (updated.length > 0 && updated[updated.length - 1].trim() !== "") {
      updated.push("");
    }
    updated.push(`${key}=${value}`);
  }

  const payload = updated.filter((line, idx, arr) => idx < arr.length - 1 || line !== "").join("\n") + "\n";
  await writeTextFile(envFilePath, payload);
}

export async function compileToRuntimeCache(
  entryFile: string,
  config: CliProjectConfig,
  cwd = process.cwd(),
): Promise<RuntimeCompileResult> {
  try {
    const source = await readTextFile(entryFile);
    const compiler = new HapticCompiler(config);
    const code = await compiler.compileSource(source, { sourcePath: entryFile });

    const codeHash = createHash("sha256").update(entryFile).update("\n").update(code).digest("hex").slice(0, 12);
    const cacheDir = resolveCacheDir(config, cwd);
    const runtimeDir = path.join(cacheDir, "runtime");
    await ensureDir(runtimeDir);

    const baseName = path.basename(entryFile, path.extname(entryFile));
    const extension = config.moduleFormat === "cjs" ? ".cjs" : ".mjs";
    const runtimeFile = path.join(runtimeDir, `${baseName}-${codeHash}${extension}`);
    await writeTextFile(runtimeFile, code);

    return { runtimeFile, codeHash };
  } catch (error) {
    throw new HapticCliError({
      code: "HPTCLI_COMPILE_FAILED",
      message: `Failed to compile runtime from ${entryFile}`,
      cause: error,
    });
  }
}

async function loadConfigByPath(absolutePath: string): Promise<CliProjectConfig> {
  try {
    if (absolutePath.endsWith(".json")) {
      const raw = await readTextFile(absolutePath);
      return parseJsonWithLocation(raw) as CliProjectConfig;
    }

    if (absolutePath.endsWith(".hpconf")) {
      const raw = await readTextFile(absolutePath);
      return parseHpconf(raw);
    }

    const mod = await import(pathToFileURL(absolutePath).href);
    return (mod.default ?? mod) as CliProjectConfig;
  } catch (error) {
    throw new HapticCliError({
      code: "HPTCLI_CONFIG_INVALID",
      message: `Failed to load config: ${absolutePath}`,
      cause: error,
    });
  }
}

async function loadOptionalConfigByPath(absolutePath: string): Promise<CliProjectConfig | undefined> {
  if (!fs.existsSync(absolutePath)) {
    return undefined;
  }

  return loadConfigByPath(absolutePath);
}

function parseHpconf(raw: string): CliProjectConfig {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return {};
  }

  if (trimmed.startsWith("{")) {
    return parseJsonWithLocation(trimmed) as CliProjectConfig;
  }

  const config: Record<string, unknown> = {};
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const compact = line.trim();
    if (compact === "" || compact.startsWith("#") || compact.startsWith("//")) {
      continue;
    }

    const separatorIdx = compact.indexOf("=");
    if (separatorIdx < 0) {
      continue;
    }

    const key = compact.slice(0, separatorIdx).trim();
    const value = compact.slice(separatorIdx + 1).trim();
    if (!key) {
      continue;
    }

    config[key] = parseHpconfScalar(value);
  }

  return config as CliProjectConfig;
}

function parseHpconfScalar(value: string): unknown {
  const normalized = stripWrappingQuotes(value.trim());

  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  if (normalized === "null") {
    return null;
  }
  if (/^-?\d+(\.\d+)?$/.test(normalized)) {
    return Number(normalized);
  }
  if ((normalized.startsWith("[") && normalized.endsWith("]")) || (normalized.startsWith("{") && normalized.endsWith("}"))) {
    try {
      return parseJsonWithLocation(normalized);
    } catch {
      return normalized;
    }
  }

  return normalized;
}

function stripWrappingQuotes(value: string): string {
  if (value.length < 2) {
    return value;
  }

  const first = value[0];
  const last = value[value.length - 1];
  if ((first === "\"" && last === "\"") || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }

  return value;
}

function parseJsonWithLocation(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw enrichJsonSyntaxError(error, raw);
    }

    throw error;
  }
}

function enrichJsonSyntaxError(error: SyntaxError, raw: string): SyntaxError {
  if (/\(line \d+ column \d+\)$/.test(error.message)) {
    return error;
  }

  const positionMatch = error.message.match(/\bposition (\d+)\b/);
  if (!positionMatch) {
    return error;
  }

  const offset = Number.parseInt(positionMatch[1], 10);
  if (!Number.isFinite(offset) || offset < 0) {
    return error;
  }

  const prefix = raw.slice(0, Math.min(offset, raw.length));
  const lines = prefix.split(/\r?\n/);
  const line = Math.max(1, lines.length);
  const column = (lines.at(-1)?.length ?? 0) + 1;
  return new SyntaxError(`${error.message} (line ${line} column ${column})`);
}
