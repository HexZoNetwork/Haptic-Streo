import type { BaseNode } from "./BaseNode.js";

export interface SelectNode extends BaseNode {
  readonly kind: "Select";
  readonly table: string;
  readonly whereField?: string;
  readonly whereExpression?: string;
  readonly rawQuery: string;
}
