export async function loadPlugin(moduleId) {
    const loaded = await import(moduleId);
    const plugin = loaded.default ?? loaded.plugin;
    if (!plugin || typeof plugin.name !== "string") {
        throw new Error(`Invalid plugin module: ${moduleId}`);
    }
    return plugin;
}
//# sourceMappingURL=plugin-loader.js.map