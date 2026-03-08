import { type CompilerConfig } from "../config/compiler-config.js";
export interface CompileResult {
    code: string;
    outFile: string;
}
export declare class HapticCompiler {
    private readonly config;
    constructor(config?: CompilerConfig);
    compileSource(source: string): Promise<string>;
    compileFile(entryFile: string): Promise<CompileResult>;
    private loadPlugins;
}
export declare function compileHapticFile(entryFile: string, config?: CompilerConfig): Promise<CompileResult>;
//# sourceMappingURL=compiler.d.ts.map