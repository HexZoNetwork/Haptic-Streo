import type { BaseNode } from "./BaseNode.js";

export interface StopNode extends BaseNode {
  readonly kind: "Stop";
}
