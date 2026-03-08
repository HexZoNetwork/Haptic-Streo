import type { BaseNode } from "./BaseNode.js";

export interface ReplyNode extends BaseNode {
  readonly kind: "Reply";
  readonly expression: string;
}
