import type { CompilerHookContext, CompilerHookName } from "./plugin-api.js";
import { PluginRegistry } from "./plugin-registry.js";

export async function runHook(
  registry: PluginRegistry,
  hook: CompilerHookName,
  context: CompilerHookContext,
): Promise<void> {
  for (const plugin of registry.getAll()) {
    const handler = plugin.hooks?.[hook];
    if (handler) {
      await handler(context);
    }
  }
}

