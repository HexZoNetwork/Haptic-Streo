import type { BaseNode } from "./BaseNode.js";
import type { StatementNode } from "./StatementNode.js";

export interface CommandNode extends BaseNode {
  readonly kind: "Command";
  readonly name: string;
  readonly body: readonly StatementNode[];
}
