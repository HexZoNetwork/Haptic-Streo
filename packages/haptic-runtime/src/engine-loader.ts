import { GramJsEngine } from "./engines/gramjs-engine.js";
import { TelegrafEngine } from "./engines/telegraf-engine.js";

export function loadEngine(engine: "telegraf" | "gramjs") {
  if (engine === "telegraf") {
    return new TelegrafEngine();
  }

  return new GramJsEngine();
}
