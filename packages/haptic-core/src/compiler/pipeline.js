import { runHook } from "@haptic/plugin-system";
import { lexStage } from "../stages/lex-stage.js";
import { generateStage } from "../stages/generate-stage.js";
import { parseStage, splitMixedSource } from "../stages/parse-stage.js";
import { semanticStage } from "../stages/semantic-stage.js";
import { transformStage } from "../stages/transform-stage.js";
export async function runPipeline(source, config, registry) {
    await runHook(registry, "beforeParse", { source });
    const { dslSource } = splitMixedSource(source);
    const lexed = lexStage(dslSource);
    if (lexed.errors.length > 0) {
        throw new Error(lexed.errors.map((e) => e.message).join("\n"));
    }
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
//# sourceMappingURL=pipeline.js.map