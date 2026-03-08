import { createToken, Lexer } from "chevrotain";
import { KEYWORDS } from "./keywords.js";
import { IDENTIFIER_PATTERN, STRING_PATTERN } from "./patterns.js";
export const WhiteSpace = createToken({
    name: "WhiteSpace",
    pattern: /[ \t\n\r]+/,
    group: Lexer.SKIPPED,
});
export const Command = createToken({
    name: "Command",
    pattern: new RegExp(`${KEYWORDS.COMMAND}\\b`),
});
export const Event = createToken({
    name: "Event",
    pattern: new RegExp(`${KEYWORDS.EVENT}\\b`),
});
export const Reply = createToken({
    name: "Reply",
    pattern: new RegExp(`${KEYWORDS.REPLY}\\b`),
});
export const Plugin = createToken({
    name: "Plugin",
    pattern: new RegExp(`${KEYWORDS.PLUGIN}\\b`),
});
export const Ai = createToken({
    name: "Ai",
    pattern: new RegExp(`${KEYWORDS.AI}\\b`),
});
export const LBrace = createToken({ name: "LBrace", pattern: /\{/ });
export const RBrace = createToken({ name: "RBrace", pattern: /\}/ });
export const Arrow = createToken({ name: "Arrow", pattern: /->/ });
export const SemiColon = createToken({ name: "SemiColon", pattern: /;/ });
export const StringLiteral = createToken({ name: "StringLiteral", pattern: STRING_PATTERN });
export const NumberLiteral = createToken({ name: "NumberLiteral", pattern: /0|[1-9]\d*(?:\.\d+)?/ });
export const Identifier = createToken({ name: "Identifier", pattern: IDENTIFIER_PATTERN });
export const allTokens = [
    WhiteSpace,
    Command,
    Event,
    Reply,
    Plugin,
    Ai,
    Arrow,
    LBrace,
    RBrace,
    SemiColon,
    StringLiteral,
    NumberLiteral,
    Identifier,
];
//# sourceMappingURL=tokens.js.map