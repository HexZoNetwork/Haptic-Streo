import type { BaseNode } from "./BaseNode.js";
import type { StatementNode } from "./StatementNode.js";

export interface TryCatchNode extends BaseNode {
  readonly kind: "TryCatch";
  readonly tryBody: readonly StatementNode[];
  readonly catchVar: string;
  readonly catchBody: readonly StatementNode[];
}
