import { createToken, Lexer } from "chevrotain";
import { KEYWORDS } from "./keywords.js";
import { IDENTIFIER_PATTERN, STRING_PATTERN } from "./patterns.js";

export const WhiteSpace = createToken({
  name: "WhiteSpace",
  pattern: /[ \t\n\r]+/,
  group: Lexer.SKIPPED,
});

export const Bot = createToken({ name: "Bot", pattern: new RegExp(`${KEYWORDS.BOT}\\b`) });
export const Userbot = createToken({
  name: "Userbot",
  pattern: new RegExp(`${KEYWORDS.USERBOT}\\b`),
});
export const On = createToken({ name: "On", pattern: new RegExp(`${KEYWORDS.ON}\\b`) });
export const Message = createToken({
  name: "Message",
  pattern: new RegExp(`${KEYWORDS.MESSAGE}\\b`),
});
export const Match = createToken({ name: "Match", pattern: new RegExp(`${KEYWORDS.MATCH}\\b`) });
export const Command = createToken({
  name: "Command",
  pattern: new RegExp(`${KEYWORDS.COMMAND}\\b`),
});
export const Event = createToken({ name: "Event", pattern: new RegExp(`${KEYWORDS.EVENT}\\b`) });
export const Reply = createToken({ name: "Reply", pattern: new RegExp(`${KEYWORDS.REPLY}\\b`) });
export const Log = createToken({ name: "Log", pattern: new RegExp(`${KEYWORDS.LOG}\\b`) });
export const Send = createToken({ name: "Send", pattern: new RegExp(`${KEYWORDS.SEND}\\b`) });
export const Plugin = createToken({
  name: "Plugin",
  pattern: new RegExp(`${KEYWORDS.PLUGIN}\\b`),
});
export const Ai = createToken({ name: "Ai", pattern: new RegExp(`${KEYWORDS.AI}\\b`) });

export const LBrace = createToken({ name: "LBrace", pattern: /\{/ });
export const RBrace = createToken({ name: "RBrace", pattern: /\}/ });
export const LParen = createToken({ name: "LParen", pattern: /\(/ });
export const RParen = createToken({ name: "RParen", pattern: /\)/ });
export const Arrow = createToken({ name: "Arrow", pattern: /->/ });
export const Equal = createToken({ name: "Equal", pattern: /=/ });
export const Dot = createToken({ name: "Dot", pattern: /\./ });
export const Plus = createToken({ name: "Plus", pattern: /\+/ });
export const SemiColon = createToken({ name: "SemiColon", pattern: /;/ });

export const StringLiteral = createToken({ name: "StringLiteral", pattern: STRING_PATTERN });
export const NumberLiteral = createToken({ name: "NumberLiteral", pattern: /0|[1-9]\d*(?:\.\d+)?/ });
export const Identifier = createToken({ name: "Identifier", pattern: IDENTIFIER_PATTERN });

// Catch-all to keep lex stage non-fatal for mixed/extended syntax.
export const Unknown = createToken({ name: "Unknown", pattern: /./ });

export const allTokens = [
  WhiteSpace,
  Bot,
  Userbot,
  On,
  Message,
  Match,
  Command,
  Event,
  Reply,
  Log,
  Send,
  Plugin,
  Ai,
  Arrow,
  LBrace,
  RBrace,
  LParen,
  RParen,
  Equal,
  Dot,
  Plus,
  SemiColon,
  StringLiteral,
  NumberLiteral,
  Identifier,
  Unknown,
];
