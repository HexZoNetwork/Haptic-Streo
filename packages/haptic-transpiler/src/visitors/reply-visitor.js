import { jsString } from "../helpers/js-string.js";
export function emitReply(message) {
    return `await ctx.reply(${jsString(message)});`;
}
//# sourceMappingURL=reply-visitor.js.map