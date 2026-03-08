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

export function syncProjectPackageJson(projectRoot: string, engine: HapticEngine, name?: string): string {
  const packagePath = path.join(projectRoot, "package.json");
  const normalizedName = name ?? path.basename(projectRoot);
  const nextTemplate = createProjectPackageJson(normalizedName, engine) as {
    name: string;
    private: boolean;
    type: string;
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
  };

  const existing = fs.existsSync(packagePath)
    ? (JSON.parse(fs.readFileSync(packagePath, "utf8")) as Record<string, unknown>)
    : {};
  const dependencies = {
    ...toRecord(existing.dependencies),
    ...nextTemplate.dependencies,
  };

  for (const candidate of Object.keys(ENGINE_DEPENDENCIES)) {
    const dependency = ENGINE_DEPENDENCIES[candidate as HapticEngine].packageName;
    if (candidate !== engine) {
      delete dependencies[dependency];
    }
  }

  const payload = {
    ...existing,
    name: typeof existing.name === "string" && existing.name.trim() ? existing.name : nextTemplate.name,
    private: typeof existing.private === "boolean" ? existing.private : nextTemplate.private,
    type: typeof existing.type === "string" && existing.type.trim() ? existing.type : nextTemplate.type,
    scripts: {
      ...toRecord(existing.scripts),
      ...nextTemplate.scripts,
    },
    dependencies,
  };

  provisionLocalCliBinary(projectRoot);
  fs.writeFileSync(packagePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return packagePath;
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

function toRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>).filter((entry): entry is [string, string] => {
    return typeof entry[1] === "string";
  });

  return Object.fromEntries(entries);
}
