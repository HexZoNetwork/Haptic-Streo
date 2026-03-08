export type NodeKind = "Program" | "Command" | "Event" | "Reply" | "Function" | "Condition" | "Loop" | "RawJS";
export interface BaseNode {
    readonly kind: NodeKind;
    readonly loc?: {
        readonly startOffset: number;
        readonly endOffset: number;
    };
}
//# sourceMappingURL=BaseNode.d.ts.map