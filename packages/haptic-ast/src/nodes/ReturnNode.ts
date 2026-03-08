import type { BaseNode } from "./BaseNode.js";

export interface ReturnNode extends BaseNode {
  readonly kind: "Return";
  readonly expression?: string;
}
