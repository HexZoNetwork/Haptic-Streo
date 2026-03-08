import path from "node:path";
import { loadPlugin, PluginRegistry } from "@haptic/plugin-system";
import { ensureDir, readTextFile, writeTextFile } from "@haptic/utils";
import { resolveCompilerConfig, } from "../config/compiler-config.js";
import { runPipeline } from "./pipeline.js";
export class HapticCompiler {
    config;
    constructor(config = {}) {
        this.config = resolveCompilerConfig(config);
    }
    async compileSource(source) {
        const registry = await this.loadPlugins();
        const result = await runPipeline(source, this.config, registry);
        return result.output;
    }
    async compileFile(entryFile) {
        const source = await readTextFile(entryFile);
        const code = await this.compileSource(source);
        const outFile = path.join(process.cwd(), this.config.outDir, `${path.basename(entryFile, path.extname(entryFile))}.js`);
        await ensureDir(path.dirname(outFile));
        await writeTextFile(outFile, code);
        return { code, outFile };
    }
    async loadPlugins() {
        const registry = new PluginRegistry();
        for (const pluginId of this.config.plugins) {
            const plugin = await loadPlugin(pluginId);
            registry.register(plugin);
        }
        return registry;
    }
}
export async function compileHapticFile(entryFile, config = {}) {
    return new HapticCompiler(config).compileFile(entryFile);
}
//# sourceMappingURL=compiler.js.map