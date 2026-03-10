import type { BaseNode } from "./BaseNode.js";

export interface ContinueNode extends BaseNode {
  readonly kind: "Continue";
}
