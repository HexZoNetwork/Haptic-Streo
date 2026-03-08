import type { BaseNode } from "./BaseNode.js";
import type { StatementNode } from "./StatementNode.js";

export interface ConditionNode extends BaseNode {
  readonly kind: "Condition";
  readonly expression: string;
  readonly body: readonly StatementNode[];
  readonly elseBody?: readonly StatementNode[];
}
