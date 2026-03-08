import type { CompilerHookContext, CompilerHookName } from "./plugin-api.js";
import { PluginRegistry } from "./plugin-registry.js";
export declare function runHook(registry: PluginRegistry, hook: CompilerHookName, context: CompilerHookContext): Promise<void>;
//# sourceMappingURL=hook-runner.d.ts.map