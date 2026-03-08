export interface CompilerConfig {
    engine?: "telegraf" | "gramjs";
    outDir?: string;
    plugins?: string[];
}
export interface ResolvedCompilerConfig {
    engine: "telegraf" | "gramjs";
    outDir: string;
    plugins: string[];
}
export declare function resolveCompilerConfig(config?: CompilerConfig): ResolvedCompilerConfig;
//# sourceMappingURL=compiler-config.d.ts.map