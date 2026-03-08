import { buildIr } from "./ir-builder.js";
import { emitCommand } from "./visitors/command-visitor.js";
export function generateJavaScript(program, options) {
    const ir = buildIr(program);
    const lines = [];
    if (options.engine === "telegraf") {
        lines.push('import { Telegraf } from "telegraf";');
        lines.push("const bot = new Telegraf(process.env.BOT_TOKEN);");
    }
    else {
        lines.push("// GramJS runtime generation is not implemented yet.");
    }
    if (ir.jsPreamble.length > 0) {
        lines.push("");
        lines.push("// JavaScript passthrough");
        lines.push(...ir.jsPreamble);
    }
    lines.push("");
    for (const command of ir.commands) {
        lines.push(emitCommand(command));
        lines.push("");
    }
    if (options.engine === "telegraf") {
        lines.push("bot.launch();");
    }
    return lines.join("\n").trimEnd() + "\n";
}
//# sourceMappingURL=js-generator.js.map