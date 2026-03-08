import fs from "node:fs";
import path from "node:path";
import { HapticCliError } from "../errors.js";

export type HapticEngine = "telegraf" | "gramjs";
export type HapticProjectType = "bot" | "userbot";

const ENGINE_DEPENDENCIES = {
  telegraf: {
    packageName: "telegraf",
    version: "^4.16.3",
  },
  gramjs: {
    packageName: "telegram",
    version: "^2.26.22",
  },
} as const satisfies Record<HapticEngine, { packageName: string; version: string }>;

const LOCAL_CLI_RELATIVE_PATH = ".haptic/bin/haptic.cjs";

export function normalizeProjectType(value: string): HapticProjectType {
  const normalized = value.trim().toLowerCase();
  if (normalized === "bot" || normalized === "userbot") {
    return normalized;
  }

  throw new HapticCliError({
    code: "HPTCLI_PROJECT_TYPE_INVALID",
    message: `Unknown project type: ${value}. Use "bot" or "userbot".`,
  });
}

export function normalizeEngine(value: string): HapticEngine {
  const normalized = value.trim().toLowerCase();
  if (normalized === "telegraf" || normalized === "gramjs") {
    return normalized;
  }

  throw new HapticCliError({
    code: "HPTCLI_ENGINE_INVALID",
    message: `Unknown engine: ${value}. Use "telegraf" or "gramjs".`,
  });
}

export function dependencyForEngine(engine: HapticEngine): { packageName: string; version: string } {
  return ENGINE_DEPENDENCIES[engine];
}

export function createProjectPackageJson(name: string, engine: HapticEngine): Record<string, unknown> {
  const engineDependency = dependencyForEngine(engine);

  return {
    name,
    private: true,
    type: "module",
    scripts: {
      dev: `node ${LOCAL_CLI_RELATIVE_PATH} dev`,
      build: `node ${LOCAL_CLI_RELATIVE_PATH} build`,
      run: `node ${LOCAL_CLI_RELATIVE_PATH} run`,
      doctor: `node ${LOCAL_CLI_RELATIVE_PATH} doctor`,
      benchmark: `node ${LOCAL_CLI_RELATIVE_PATH} benchmark`,
    },
    dependencies: {
      [engineDependency.packageName]: engineDependency.version,
    },
  };
}

export function provisionLocalCliBinary(projectRoot: string): string {
  const source = resolveLocalCliSource();
  const target = path.join(projectRoot, LOCAL_CLI_RELATIVE_PATH);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  fs.chmodSync(target, 0o755);
  return target;
}

function resolveLocalCliSource(): string {
  const directExecutable = process.argv[1];
  const candidates = [
    directExecutable && path.basename(directExecutable).toLowerCase() === "haptic.cjs" ? directExecutable : undefined,
    directExecutable ? path.resolve(path.dirname(directExecutable), "../../haptic/bin/haptic.cjs") : undefined,
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new HapticCliError({
    code: "HPTCLI_LOCAL_BINARY_NOT_FOUND",
    message: "Unable to locate local Haptic CLI binary for project scaffolding.",
  });
}
