import type { ProgramNode } from "@haptic/ast";
import { type PluginRegistry } from "@haptic/plugin-system";
import type { ResolvedCompilerConfig } from "../config/compiler-config.js";
export interface PipelineOutput {
    ast: ProgramNode;
    output: string;
}
export declare function runPipeline(source: string, config: ResolvedCompilerConfig, registry: PluginRegistry): Promise<PipelineOutput>;
//# sourceMappingURL=pipeline.d.ts.map