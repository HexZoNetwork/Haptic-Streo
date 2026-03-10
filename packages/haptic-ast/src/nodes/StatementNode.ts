import type { BotNode } from "./BotNode.js";
import type { BreakNode } from "./BreakNode.js";
import type { CommandNode } from "./CommandNode.js";
import type { ConditionNode } from "./ConditionNode.js";
import type { ContinueNode } from "./ContinueNode.js";
import type { DeleteNode } from "./DeleteNode.js";
import type { DbNode } from "./DbNode.js";
import type { EventNode } from "./EventNode.js";
import type { FunctionNode } from "./FunctionNode.js";
import type { InsertNode } from "./InsertNode.js";
import type { LetNode } from "./LetNode.js";
import type { LogNode } from "./LogNode.js";
import type { LoopNode } from "./LoopNode.js";
import type { RawJsNode } from "./RawJsNode.js";
import type { ReplyNode } from "./ReplyNode.js";
import type { ReturnNode } from "./ReturnNode.js";
import type { SelectNode } from "./SelectNode.js";
import type { SendNode } from "./SendNode.js";
import type { StopNode } from "./StopNode.js";
import type { TryCatchNode } from "./TryCatchNode.js";
import type { UpdateNode } from "./UpdateNode.js";
import type { WhileNode } from "./WhileNode.js";

export type StatementNode =
  | BotNode
  | BreakNode
  | CommandNode
  | EventNode
  | ReplyNode
  | LogNode
  | SendNode
  | LetNode
  | ReturnNode
  | StopNode
  | FunctionNode
  | ConditionNode
  | ContinueNode
  | LoopNode
  | WhileNode
  | TryCatchNode
  | DbNode
  | InsertNode
  | SelectNode
  | UpdateNode
  | DeleteNode
  | RawJsNode;
