import { GramJsEngine } from "./engines/gramjs-engine.js";
import { TelegrafEngine } from "./engines/telegraf-engine.js";
export function loadEngine(engine) {
    if (engine === "telegraf") {
        return new TelegrafEngine();
    }
    return new GramJsEngine();
}
//# sourceMappingURL=engine-loader.js.map