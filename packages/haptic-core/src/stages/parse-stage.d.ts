import { type ProgramNode } from "@haptic/ast";
export interface SourceSplit {
    dslSource: string;
    jsPreamble: string[];
}
export declare function splitMixedSource(source: string): SourceSplit;
export declare function parseStage(source: string): ProgramNode;
//# sourceMappingURL=parse-stage.d.ts.map