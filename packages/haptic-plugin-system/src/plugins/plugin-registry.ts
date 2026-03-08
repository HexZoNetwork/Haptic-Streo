import type { HapticPlugin } from "./plugin-api.js";

export class PluginRegistry {
  private readonly plugins = new Map<string, HapticPlugin>();

  register(plugin: HapticPlugin): void {
    this.plugins.set(plugin.name, plugin);
  }

  getAll(): HapticPlugin[] {
    return [...this.plugins.values()];
  }
}

