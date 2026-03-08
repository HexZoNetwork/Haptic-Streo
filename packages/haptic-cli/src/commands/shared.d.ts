import type { CompilerConfig } from "@haptic/core";
export interface CliProjectConfig extends CompilerConfig {
    entry?: string;
}
export declare function loadProjectConfig(configPath?: string, cwd?: string): Promise<CliProjectConfig>;
//# sourceMappingURL=shared.d.ts.map