import type { BaseNode } from "./BaseNode.js";

export interface BreakNode extends BaseNode {
  readonly kind: "Break";
}
