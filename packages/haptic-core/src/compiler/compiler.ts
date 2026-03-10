import path from "node:path";
import { loadPlugin, PluginRegistry } from "@haptic/plugin-system";
import { ensureDir, readTextFile, writeTextFile } from "@haptic/utils";
import {
  type CompilerConfig,
  resolveCompilerConfig,
  type ResolvedCompilerConfig,
} from "../config/compiler-config.js";
import { HapticCompilerError, ensureCompilerError } from "../errors.js";
import { runPipeline } from "./pipeline.js";

export interface CompileResult {
  code: string;
  outFile: string;
}

export class HapticCompiler {
  private readonly config: ResolvedCompilerConfig;

  constructor(config: CompilerConfig = {}) {
    this.config = resolveCompilerConfig(config);
  }

  async compileSource(source: string, options: { sourcePath?: string } = {}): Promise<string> {
    try {
      const registry = await this.loadPlugins();
      const resolvedSource = options.sourcePath
        ? await resolveImportedSource(source, options.sourcePath)
        : source;
      const result = await runPipeline(resolvedSource, this.config, registry);
      return result.output;
    } catch (error) {
      throw ensureCompilerError(error, {
        code: "HPTC_COMPILE_FAILED",
        message: "Compilation failed",
        stage: "compile",
      });
    }
  }

  async compileFile(entryFile: string): Promise<CompileResult> {
    try {
      const source = await readTextFile(entryFile);
      const code = await this.compileSource(source, { sourcePath: entryFile });
      const outDir = path.isAbsolute(this.config.outDir)
        ? this.config.outDir
        : path.join(process.cwd(), this.config.outDir);
      const extension = this.config.moduleFormat === "cjs" ? ".cjs" : ".mjs";
      const outFile = path.join(outDir, `${path.basename(entryFile, path.extname(entryFile))}${extension}`);

      await ensureDir(path.dirname(outFile));
      await writeTextFile(outFile, code);

      return { code, outFile };
    } catch (error) {
      if (error instanceof HapticCompilerError) {
        throw error;
      }

      throw ensureCompilerError(error, {
        code: "HPTC_COMPILE_FILE_FAILED",
        message: `Failed to compile file: ${entryFile}`,
        stage: "compile-file",
      });
    }
  }

  private async loadPlugins(): Promise<PluginRegistry> {
    const registry = new PluginRegistry();

    for (const pluginId of this.config.plugins) {
      try {
        const plugin = await loadPlugin(pluginId);
        registry.register(plugin);
      } catch (error) {
        throw ensureCompilerError(error, {
          code: "HPTC_PLUGIN_LOAD_FAILED",
          message: `Failed to load plugin: ${pluginId}`,
          stage: "plugin-load",
        });
      }
    }

    return registry;
  }
}

export async function compileHapticFile(
  entryFile: string,
  config: CompilerConfig = {},
): Promise<CompileResult> {
  return new HapticCompiler(config).compileFile(entryFile);
}

async function resolveImportedSource(
  source: string,
  sourcePath: string,
  seen = new Set<string>(),
): Promise<string> {
  const normalizedPath = path.resolve(sourcePath);
  if (seen.has(normalizedPath)) {
    throw new HapticCompilerError({
      code: "HPTC_IMPORT_CYCLE",
      message: `Import cycle detected at ${normalizedPath}`,
      stage: "compile",
    });
  }

  seen.add(normalizedPath);
  const directory = path.dirname(normalizedPath);
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const output: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const importMatch = trimmed.match(/^import\s+"([^"]+\.haptic)"\s*;?$/);
    if (!importMatch) {
      output.push(line);
      continue;
    }

    const importPath = path.resolve(directory, importMatch[1]);
    const importedSource = await readTextFile(importPath);
    output.push(`// import ${importMatch[1]}`);
    output.push(await resolveImportedSource(importedSource, importPath, seen));
  }

  seen.delete(normalizedPath);
  return output.join("\n");
}
