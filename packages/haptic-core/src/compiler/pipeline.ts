import type { ProgramNode } from "@haptic/ast";
import { runHook, type PluginRegistry } from "@haptic/plugin-system";
import type { ResolvedCompilerConfig } from "../config/compiler-config.js";
import { ensureCompilerError } from "../errors.js";
import { lexStage } from "../stages/lex-stage.js";
import { generateStage } from "../stages/generate-stage.js";
import { parseStage } from "../stages/parse-stage.js";
import { semanticStage } from "../stages/semantic-stage.js";
import { transformStage } from "../stages/transform-stage.js";

export interface PipelineOutput {
  ast: ProgramNode;
  output: string;
}

export async function runPipeline(
  source: string,
  config: ResolvedCompilerConfig,
  registry: PluginRegistry,
): Promise<PipelineOutput> {
  try {
    await runHook(registry, "beforeParse", { source });
  } catch (error) {
    throw ensureCompilerError(error, {
      code: "HPTC_PLUGIN_HOOK_FAILED",
      message: "Plugin hook failed beforeParse",
      stage: "beforeParse",
    });
  }

  lexStage(source);

  const parsed = parseStage(source);

  try {
    await runHook(registry, "afterParse", { ast: parsed });
  } catch (error) {
    throw ensureCompilerError(error, {
      code: "HPTC_PLUGIN_HOOK_FAILED",
      message: "Plugin hook failed afterParse",
      stage: "afterParse",
    });
  }

  const semanticAst = semanticStage(parsed);

  try {
    await runHook(registry, "beforeTransform", { ast: semanticAst });
  } catch (error) {
    throw ensureCompilerError(error, {
      code: "HPTC_PLUGIN_HOOK_FAILED",
      message: "Plugin hook failed beforeTransform",
      stage: "beforeTransform",
    });
  }

  const transformed = transformStage(semanticAst);

  try {
    await runHook(registry, "afterTransform", { ast: transformed });
  } catch (error) {
    throw ensureCompilerError(error, {
      code: "HPTC_PLUGIN_HOOK_FAILED",
      message: "Plugin hook failed afterTransform",
      stage: "afterTransform",
    });
  }

  try {
    await runHook(registry, "beforeGenerate", { ast: transformed });
  } catch (error) {
    throw ensureCompilerError(error, {
      code: "HPTC_PLUGIN_HOOK_FAILED",
      message: "Plugin hook failed beforeGenerate",
      stage: "beforeGenerate",
    });
  }

  const output = generateStage(transformed, config.engine, config.moduleFormat);

  try {
    await runHook(registry, "afterGenerate", { ast: transformed, output });
  } catch (error) {
    throw ensureCompilerError(error, {
      code: "HPTC_PLUGIN_HOOK_FAILED",
      message: "Plugin hook failed afterGenerate",
      stage: "afterGenerate",
    });
  }

  return { ast: transformed, output };
}
