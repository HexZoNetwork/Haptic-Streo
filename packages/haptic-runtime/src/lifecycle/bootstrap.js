import { loadEngine } from "../engine-loader.js";
export async function bootstrapRuntime(engine) {
    const runtime = loadEngine(engine);
    await runtime.bootstrap();
}
//# sourceMappingURL=bootstrap.js.map