import type { BaseNode } from "./BaseNode.js";
import type { StatementNode } from "./StatementNode.js";

export interface WhileNode extends BaseNode {
  readonly kind: "While";
  readonly condition: string;
  readonly body: readonly StatementNode[];
}
