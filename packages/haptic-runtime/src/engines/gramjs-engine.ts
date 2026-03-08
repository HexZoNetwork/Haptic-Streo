import type { RuntimeEngine } from "./telegraf-engine.js";

export class GramJsEngine implements RuntimeEngine {
  readonly name = "gramjs" as const;

  async bootstrap(): Promise<void> {
    throw new Error("GramJS runtime is not implemented in MVP.");
  }
}
