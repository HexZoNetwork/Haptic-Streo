import { loadEngine } from "../engine-loader.js";

export async function bootstrapRuntime(engine: "telegraf" | "gramjs"): Promise<void> {
  const runtime = loadEngine(engine);
  await runtime.bootstrap();
}
