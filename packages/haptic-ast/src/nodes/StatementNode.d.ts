import type { CommandNode } from "./CommandNode.js";
import type { ConditionNode } from "./ConditionNode.js";
import type { EventNode } from "./EventNode.js";
import type { FunctionNode } from "./FunctionNode.js";
import type { LoopNode } from "./LoopNode.js";
import type { RawJsNode } from "./RawJsNode.js";
import type { ReplyNode } from "./ReplyNode.js";
export type StatementNode = CommandNode | EventNode | ReplyNode | FunctionNode | ConditionNode | LoopNode | RawJsNode;
//# sourceMappingURL=StatementNode.d.ts.map