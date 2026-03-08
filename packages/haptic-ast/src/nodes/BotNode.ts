import type { BaseNode } from "./BaseNode.js";

export interface BotNode extends BaseNode {
  readonly kind: "Bot";
  readonly runtime: "bot" | "userbot";
  readonly name: string;
  readonly config: Readonly<Record<string, string>>;
}
