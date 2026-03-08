import type { BaseNode } from "./BaseNode.js";

export interface InsertNode extends BaseNode {
  readonly kind: "Insert";
  readonly table: string;
  readonly values: Readonly<Record<string, string>>;
}
