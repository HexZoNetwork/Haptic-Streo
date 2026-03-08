import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { HapticCompiler, type CompilerConfig } from "@haptic/core";
import { ensureDir, readTextFile, writeTextFile } from "@haptic/utils";

export interface CliProjectConfig extends CompilerConfig {
  entry?: string;
  cacheDir?: string;
  runtimeMode?: "jit" | "build";
  envFile?: string;
  profile?: string;
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
    const loaded = await loadConfigByPath(resolved);
    return {
      config: loaded,
      configPath: resolved,
      projectRoot: path.dirname(resolved),
    };
  }

  const hpconfPath = path.resolve(cwd, "config.hpconf");
  const hpconfConfig = await tryLoadConfigByPath(hpconfPath);
  if (hpconfConfig) {
    return { config: hpconfConfig, configPath: hpconfPath, projectRoot: path.dirname(hpconfPath) };
  }

  const hptcfPath = path.resolve(cwd, "hptcf.json");
  const hptcfConfig = await tryLoadConfigByPath(hptcfPath);
  if (hptcfConfig) {
    return { config: hptcfConfig, configPath: hptcfPath, projectRoot: path.dirname(hptcfPath) };
  }

  const legacyPath = path.resolve(cwd, "haptic.config.js");
  const legacyConfig = await tryLoadConfigByPath(legacyPath);
  if (legacyConfig) {
    return { config: legacyConfig, configPath: legacyPath, projectRoot: path.dirname(legacyPath) };
  }

  return { config: {}, projectRoot: cwd };
}

export function resolveEntryPath(entry: string | undefined, config: CliProjectConfig, cwd = process.cwd()): string {
  return path.resolve(cwd, entry ?? config.entry ?? "bot.haptic");
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
  const source = await readTextFile(entryFile);
  const compiler = new HapticCompiler(config);
  const code = await compiler.compileSource(source);

  const codeHash = createHash("sha256").update(entryFile).update("\n").update(code).digest("hex").slice(0, 12);
  const cacheDir = resolveCacheDir(config, cwd);
  const runtimeDir = path.join(cacheDir, "runtime");
  await ensureDir(runtimeDir);

  const baseName = path.basename(entryFile, path.extname(entryFile));
  const runtimeFile = path.join(runtimeDir, `${baseName}-${codeHash}.mjs`);
  await writeTextFile(runtimeFile, code);

  return { runtimeFile, codeHash };
}

async function loadConfigByPath(absolutePath: string): Promise<CliProjectConfig> {
  if (absolutePath.endsWith(".json")) {
    const raw = await readTextFile(absolutePath);
    return JSON.parse(raw) as CliProjectConfig;
  }

  if (absolutePath.endsWith(".hpconf")) {
    const raw = await readTextFile(absolutePath);
    return parseHpconf(raw);
  }

  const mod = await import(pathToFileURL(absolutePath).href);
  return (mod.default ?? mod) as CliProjectConfig;
}

async function tryLoadConfigByPath(absolutePath: string): Promise<CliProjectConfig | undefined> {
  try {
    return await loadConfigByPath(absolutePath);
  } catch {
    return undefined;
  }
}

function parseHpconf(raw: string): CliProjectConfig {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return {};
  }

  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed) as CliProjectConfig;
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
      return JSON.parse(normalized);
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
