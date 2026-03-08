export class PluginRegistry {
    plugins = new Map();
    register(plugin) {
        this.plugins.set(plugin.name, plugin);
    }
    getAll() {
        return [...this.plugins.values()];
    }
}
//# sourceMappingURL=plugin-registry.js.map