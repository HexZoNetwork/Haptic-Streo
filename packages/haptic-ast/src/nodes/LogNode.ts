import type { BaseNode } from "./BaseNode.js";

export interface LogNode extends BaseNode {
  readonly kind: "Log";
  readonly expression: string;
}
