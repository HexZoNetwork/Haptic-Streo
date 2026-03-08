import type { BaseNode } from "./BaseNode.js";
import type { StatementNode } from "./StatementNode.js";
export interface FunctionNode extends BaseNode {
    readonly kind: "Function";
    readonly name: string;
    readonly body: readonly StatementNode[];
}
//# sourceMappingURL=FunctionNode.d.ts.map