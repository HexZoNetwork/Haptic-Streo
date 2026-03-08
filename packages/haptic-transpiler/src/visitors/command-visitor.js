import { jsString } from "../helpers/js-string.js";
export function emitCommand(command) {
    const lines = [];
    lines.push(`bot.command(${jsString(command.name)}, async (ctx) => {`);
    for (const statement of command.body) {
        lines.push(`  await ctx.reply(${jsString(statement.message)});`);
    }
    lines.push("});");
    return lines.join("\n");
}
//# sourceMappingURL=command-visitor.js.map