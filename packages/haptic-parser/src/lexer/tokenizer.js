import { Lexer } from "chevrotain";
import { allTokens } from "./tokens.js";
const lexer = new Lexer(allTokens);
export function tokenize(source) {
    return lexer.tokenize(source);
}
//# sourceMappingURL=tokenizer.js.map