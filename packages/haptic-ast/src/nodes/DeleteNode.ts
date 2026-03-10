import type { BaseNode } from "./BaseNode.js";

export interface DeleteNode extends BaseNode {
  readonly kind: "Delete";
  readonly table: string;
  readonly whereField: string;
  readonly whereExpression: string;
}
