export async function runHook(registry, hook, context) {
    for (const plugin of registry.getAll()) {
        const handler = plugin.hooks?.[hook];
        if (handler) {
            await handler(context);
        }
    }
}
//# sourceMappingURL=hook-runner.js.map