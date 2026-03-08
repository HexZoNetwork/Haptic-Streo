import type { BaseNode } from "./BaseNode.js";
import type { StatementNode } from "./StatementNode.js";
export interface LoopNode extends BaseNode {
    readonly kind: "Loop";
    readonly expression: string;
    readonly body: readonly StatementNode[];
}
//# sourceMappingURL=LoopNode.d.ts.map