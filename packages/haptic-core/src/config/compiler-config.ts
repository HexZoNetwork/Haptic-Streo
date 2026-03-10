export interface CompilerConfig {
  engine?: "telegraf" | "gramjs";
  outDir?: string;
  plugins?: string[];
  moduleFormat?: "esm" | "cjs";
}

export interface ResolvedCompilerConfig {
  engine: "telegraf" | "gramjs";
  outDir: string;
  plugins: string[];
  moduleFormat: "esm" | "cjs";
}

export function resolveCompilerConfig(config: CompilerConfig = {}): ResolvedCompilerConfig {
  return {
    engine: config.engine ?? "telegraf",
    outDir: config.outDir ?? "dist",
    plugins: config.plugins ?? [],
    moduleFormat: config.moduleFormat ?? "esm",
  };
}
