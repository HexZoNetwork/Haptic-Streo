import type { HapticPlugin } from "./plugin-api.js";
export declare class PluginRegistry {
    private readonly plugins;
    register(plugin: HapticPlugin): void;
    getAll(): HapticPlugin[];
}
//# sourceMappingURL=plugin-registry.d.ts.map