import type { BaseNode } from "./BaseNode.js";
import type { StatementNode } from "./StatementNode.js";

export interface EventNode extends BaseNode {
  readonly kind: "Event";
  readonly eventType: "message" | "command";
  readonly command?: string;
  readonly match?: string;
  readonly body: readonly StatementNode[];
}
