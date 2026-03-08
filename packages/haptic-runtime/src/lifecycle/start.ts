import { bootstrapRuntime } from "./bootstrap.js";

export async function startRuntime(engine: "telegraf" | "gramjs"): Promise<void> {
  await bootstrapRuntime(engine);
}
