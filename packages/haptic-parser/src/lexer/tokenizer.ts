import { Lexer } from "chevrotain";
import { allTokens } from "./tokens.js";

const lexer = new Lexer(allTokens);

export function tokenize(source: string) {
  return lexer.tokenize(source);
}
