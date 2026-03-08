import path from "node:path";
import { pathToFileURL } from "node:url";
export async function loadProjectConfig(configPath = "haptic.config.js", cwd = process.cwd()) {
    const absolute = path.resolve(cwd, configPath);
    try {
        const mod = await import(pathToFileURL(absolute).href);
        return (mod.default ?? mod);
    }
    catch {
        return {};
    }
}
//# sourceMappingURL=shared.js.map