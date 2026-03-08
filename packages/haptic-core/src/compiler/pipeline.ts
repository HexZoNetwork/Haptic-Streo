import type { ProgramNode } from "@haptic/ast";
import { runHook, type PluginRegistry } from "@haptic/plugin-system";
import type { ResolvedCompilerConfig } from "../config/compiler-config.js";
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
  await runHook(registry, "beforeParse", { source });

  lexStage(source);

  const parsed = parseStage(source);
  await runHook(registry, "afterParse", { ast: parsed });

  const semanticAst = semanticStage(parsed);
  await runHook(registry, "beforeTransform", { ast: semanticAst });

  const transformed = transformStage(semanticAst);
  await runHook(registry, "afterTransform", { ast: transformed });

  await runHook(registry, "beforeGenerate", { ast: transformed });
  const output = generateStage(transformed, config.engine);
  await runHook(registry, "afterGenerate", { ast: transformed, output });

  return { ast: transformed, output };
}
