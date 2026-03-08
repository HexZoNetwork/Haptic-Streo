import type { HapticPlugin } from "./plugin-api.js";

export async function loadPlugin(moduleId: string): Promise<HapticPlugin> {
  const loaded = await import(moduleId);
  const plugin = loaded.default ?? loaded.plugin;

  if (!plugin || typeof plugin.name !== "string") {
    throw new Error(`Invalid plugin module: ${moduleId}`);
  }

  return plugin as HapticPlugin;
}

