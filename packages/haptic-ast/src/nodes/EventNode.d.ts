import type { BaseNode } from "./BaseNode.js";
import type { StatementNode } from "./StatementNode.js";
export interface EventNode extends BaseNode {
    readonly kind: "Event";
    readonly name: string;
    readonly body: readonly StatementNode[];
}
//# sourceMappingURL=EventNode.d.ts.map