import type { BaseNode } from "./BaseNode.js";

export interface DbField {
  readonly name: string;
  readonly dataType: string;
}

export interface DbNode extends BaseNode {
  readonly kind: "Db";
  readonly name: string;
  readonly fields: readonly DbField[];
}
