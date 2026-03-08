export function resolveCompilerConfig(config = {}) {
    return {
        engine: config.engine ?? "telegraf",
        outDir: config.outDir ?? "dist",
        plugins: config.plugins ?? [],
    };
}
//# sourceMappingURL=compiler-config.js.map