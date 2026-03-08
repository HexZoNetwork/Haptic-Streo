import type { BaseNode } from "./BaseNode.js";

export interface SendNode extends BaseNode {
  readonly kind: "Send";
  readonly targetExpression: string;
  readonly messageExpression: string;
}
