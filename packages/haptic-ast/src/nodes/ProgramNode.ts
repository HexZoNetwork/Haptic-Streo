import type { BaseNode } from "./BaseNode.js";
import type { StatementNode } from "./StatementNode.js";

export interface ProgramNode extends BaseNode {
  readonly kind: "Program";
  readonly body: readonly StatementNode[];
  readonly jsPreamble: readonly string[];
}
