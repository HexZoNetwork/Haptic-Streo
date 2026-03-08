import type { ProgramNode } from "@haptic/ast";
export interface IrReply {
    readonly type: "reply";
    readonly message: string;
}
export interface IrCommand {
    readonly type: "command";
    readonly name: string;
    readonly body: readonly IrReply[];
}
export interface IrProgram {
    readonly commands: readonly IrCommand[];
    readonly jsPreamble: readonly string[];
}
export declare function buildIr(program: ProgramNode): IrProgram;
//# sourceMappingURL=ir-builder.d.ts.map