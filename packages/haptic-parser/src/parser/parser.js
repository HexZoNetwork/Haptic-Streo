import { EmbeddedActionsParser, } from "chevrotain";
import { createCommandNode, createProgramNode, createReplyNode, } from "@haptic/ast";
import { allTokens, Command, Identifier, LBrace, RBrace, Reply, SemiColon, StringLiteral, } from "../lexer/tokens.js";
import { tokenize } from "../lexer/tokenizer.js";
class HapticEmbeddedParser extends EmbeddedActionsParser {
    constructor() {
        super(allTokens);
        this.performSelfAnalysis();
    }
    program = this.RULE("program", () => {
        const body = [];
        this.MANY(() => {
            body.push(this.SUBRULE(this.commandDeclaration));
        });
        return createProgramNode(body);
    });
    commandDeclaration = this.RULE("commandDeclaration", () => {
        this.CONSUME(Command);
        const commandName = this.CONSUME(Identifier).image;
        this.CONSUME(LBrace);
        const body = [];
        this.MANY(() => {
            body.push(this.SUBRULE(this.replyStatement));
        });
        this.CONSUME(RBrace);
        return createCommandNode(commandName, body);
    });
    replyStatement = this.RULE("replyStatement", () => {
        this.CONSUME(Reply);
        const raw = this.CONSUME(StringLiteral).image;
        this.OPTION(() => this.CONSUME(SemiColon));
        return createReplyNode(stripQuotes(raw));
    });
}
function stripQuotes(input) {
    return input.slice(1, -1).replace(/\\"/g, '"');
}
export function parseDsl(source) {
    const lexResult = tokenize(source);
    const parser = new HapticEmbeddedParser();
    parser.input = lexResult.tokens;
    const ast = parser.program();
    return {
        ast,
        lexErrors: lexResult.errors,
        parseErrors: parser.errors,
    };
}
//# sourceMappingURL=parser.js.map