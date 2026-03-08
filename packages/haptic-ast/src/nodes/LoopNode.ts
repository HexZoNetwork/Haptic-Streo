import type { BaseNode } from "./BaseNode.js";
import type { StatementNode } from "./StatementNode.js";

export interface LoopNode extends BaseNode {
  readonly kind: "Loop";
  readonly iterator: string;
  readonly iterableExpression: string;
  readonly body: readonly StatementNode[];
}
