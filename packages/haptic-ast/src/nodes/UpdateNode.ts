import type { BaseNode } from "./BaseNode.js";

export interface UpdateNode extends BaseNode {
  readonly kind: "Update";
  readonly table: string;
  readonly whereField: string;
  readonly whereExpression: string;
  readonly values: Readonly<Record<string, string>>;
}
