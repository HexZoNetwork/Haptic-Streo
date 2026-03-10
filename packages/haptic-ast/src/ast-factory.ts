import type { BotNode } from "./nodes/BotNode.js";
import type { BreakNode } from "./nodes/BreakNode.js";
import type { CommandNode } from "./nodes/CommandNode.js";
import type { ConditionNode } from "./nodes/ConditionNode.js";
import type { ContinueNode } from "./nodes/ContinueNode.js";
import type { DeleteNode } from "./nodes/DeleteNode.js";
import type { DbField, DbNode } from "./nodes/DbNode.js";
import type { EventNode } from "./nodes/EventNode.js";
import type { FunctionNode } from "./nodes/FunctionNode.js";
import type { InsertNode } from "./nodes/InsertNode.js";
import type { LetNode } from "./nodes/LetNode.js";
import type { LogNode } from "./nodes/LogNode.js";
import type { LoopNode } from "./nodes/LoopNode.js";
import type { ProgramNode } from "./nodes/ProgramNode.js";
import type { RawJsNode } from "./nodes/RawJsNode.js";
import type { ReplyNode } from "./nodes/ReplyNode.js";
import type { ReturnNode } from "./nodes/ReturnNode.js";
import type { SelectNode } from "./nodes/SelectNode.js";
import type { SendNode } from "./nodes/SendNode.js";
import type { StatementNode } from "./nodes/StatementNode.js";
import type { StopNode } from "./nodes/StopNode.js";
import type { TryCatchNode } from "./nodes/TryCatchNode.js";
import type { UpdateNode } from "./nodes/UpdateNode.js";
import type { WhileNode } from "./nodes/WhileNode.js";

export function createProgramNode(
  body: readonly StatementNode[],
  jsPreamble: readonly string[] = [],
): ProgramNode {
  return Object.freeze({ kind: "Program" as const, body, jsPreamble });
}

export function createBotNode(
  runtime: "bot" | "userbot",
  name: string,
  config: Readonly<Record<string, string>>,
): BotNode {
  return Object.freeze({ kind: "Bot" as const, runtime, name, config });
}

export function createCommandNode(name: string, body: readonly StatementNode[]): CommandNode {
  return Object.freeze({ kind: "Command" as const, name, body });
}

export function createEventNode(
  eventType: "message" | "command",
  body: readonly StatementNode[],
  command?: string,
  match?: string,
): EventNode {
  return Object.freeze({ kind: "Event" as const, eventType, command, match, body });
}

export function createReplyNode(expression: string): ReplyNode {
  return Object.freeze({ kind: "Reply" as const, expression });
}

export function createLogNode(expression: string): LogNode {
  return Object.freeze({ kind: "Log" as const, expression });
}

export function createSendNode(targetExpression: string, messageExpression: string): SendNode {
  return Object.freeze({ kind: "Send" as const, targetExpression, messageExpression });
}

export function createLetNode(
  name: string,
  expression: string,
  declarationKind: "let" | "const" | "var" = "let",
): LetNode {
  return Object.freeze({ kind: "Let" as const, declarationKind, name, expression });
}

export function createReturnNode(expression?: string): ReturnNode {
  return Object.freeze({ kind: "Return" as const, expression });
}

export function createStopNode(): StopNode {
  return Object.freeze({ kind: "Stop" as const });
}

export function createBreakNode(): BreakNode {
  return Object.freeze({ kind: "Break" as const });
}

export function createContinueNode(): ContinueNode {
  return Object.freeze({ kind: "Continue" as const });
}

export function createFunctionNode(
  name: string,
  params: readonly string[],
  body: readonly StatementNode[],
  exported = false,
): FunctionNode {
  return Object.freeze({ kind: "Function" as const, name, params, body, exported });
}

export function createConditionNode(
  expression: string,
  body: readonly StatementNode[],
  elseBody?: readonly StatementNode[],
): ConditionNode {
  return Object.freeze({ kind: "Condition" as const, expression, body, elseBody });
}

export function createLoopNode(
  iterator: string,
  iterableExpression: string,
  body: readonly StatementNode[],
): LoopNode {
  return Object.freeze({ kind: "Loop" as const, iterator, iterableExpression, body });
}

export function createWhileNode(
  condition: string,
  body: readonly StatementNode[],
): WhileNode {
  return Object.freeze({ kind: "While" as const, condition, body });
}

export function createTryCatchNode(
  tryBody: readonly StatementNode[],
  catchVar: string,
  catchBody: readonly StatementNode[],
): TryCatchNode {
  return Object.freeze({ kind: "TryCatch" as const, tryBody, catchVar, catchBody });
}

export function createDbNode(name: string, fields: readonly DbField[]): DbNode {
  return Object.freeze({ kind: "Db" as const, name, fields });
}

export function createInsertNode(table: string, values: Readonly<Record<string, string>>): InsertNode {
  return Object.freeze({ kind: "Insert" as const, table, values });
}

export function createSelectNode(
  table: string,
  rawQuery: string,
  whereField?: string,
  whereExpression?: string,
  resultVariable?: string,
  declarationKind?: "let" | "const" | "var",
): SelectNode {
  return Object.freeze({
    kind: "Select" as const,
    table,
    whereField,
    whereExpression,
    rawQuery,
    resultVariable,
    declarationKind,
  });
}

export function createUpdateNode(
  table: string,
  whereField: string,
  whereExpression: string,
  values: Readonly<Record<string, string>>,
): UpdateNode {
  return Object.freeze({ kind: "Update" as const, table, whereField, whereExpression, values });
}

export function createDeleteNode(
  table: string,
  whereField: string,
  whereExpression: string,
): DeleteNode {
  return Object.freeze({ kind: "Delete" as const, table, whereField, whereExpression });
}

export function createRawJsNode(source: string): RawJsNode {
  return Object.freeze({ kind: "RawJS" as const, source });
}
