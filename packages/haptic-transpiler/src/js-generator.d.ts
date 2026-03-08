import type { ProgramNode } from "@haptic/ast";
export interface GenerateJsOptions {
    readonly engine: "telegraf" | "gramjs";
}
export declare function generateJavaScript(program: ProgramNode, options: GenerateJsOptions): string;
//# sourceMappingURL=js-generator.d.ts.map