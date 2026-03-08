import { type ILexingError, type IRecognitionException } from "chevrotain";
import { type ProgramNode } from "@haptic/ast";
export interface ParseResult {
    readonly ast: ProgramNode;
    readonly lexErrors: readonly ILexingError[];
    readonly parseErrors: readonly IRecognitionException[];
}
export declare function parseDsl(source: string): ParseResult;
//# sourceMappingURL=parser.d.ts.map