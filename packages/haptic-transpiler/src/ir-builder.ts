import type { DbField, ProgramNode, StatementNode } from "@haptic/ast";

export interface IrBot {
  readonly runtime: "bot" | "userbot";
  readonly name: string;
  readonly config: Readonly<Record<string, string>>;
}

export interface IrDb {
  readonly type: "db";
  readonly name: string;
  readonly fields: readonly DbField[];
}

export interface IrFunction {
  readonly type: "function";
  readonly name: string;
  readonly params: readonly string[];
  readonly body: readonly IrStatement[];
  readonly exported?: boolean;
}

export type IrStatement =
  | { readonly type: "reply"; readonly expression: string }
  | { readonly type: "log"; readonly expression: string }
  | {
      readonly type: "send";
      readonly targetExpression: string;
      readonly messageExpression: string;
    }
  | {
      readonly type: "let";
      readonly declarationKind: "let" | "const" | "var";
      readonly name: string;
      readonly expression: string;
    }
  | { readonly type: "return"; readonly expression?: string }
  | { readonly type: "stop" }
  | {
      readonly type: "if";
      readonly condition: string;
      readonly thenBody: readonly IrStatement[];
      readonly elseBody?: readonly IrStatement[];
    }
  | {
      readonly type: "for";
      readonly iterator: string;
      readonly iterableExpression: string;
      readonly body: readonly IrStatement[];
    }
  | {
      readonly type: "while";
      readonly condition: string;
      readonly body: readonly IrStatement[];
    }
  | {
      readonly type: "try";
      readonly catchVar: string;
      readonly tryBody: readonly IrStatement[];
      readonly catchBody: readonly IrStatement[];
    }
  | { readonly type: "break" }
  | { readonly type: "continue" }
  | {
      readonly type: "insert";
      readonly table: string;
      readonly values: Readonly<Record<string, string>>;
    }
  | {
      readonly type: "update";
      readonly table: string;
      readonly whereField: string;
      readonly whereExpression: string;
      readonly values: Readonly<Record<string, string>>;
    }
  | {
      readonly type: "select";
      readonly table: string;
      readonly whereField?: string;
      readonly whereExpression?: string;
      readonly rawQuery: string;
      readonly resultVariable?: string;
      readonly declarationKind?: "let" | "const" | "var";
    }
  | {
      readonly type: "delete";
      readonly table: string;
      readonly whereField: string;
      readonly whereExpression: string;
    }
  | { readonly type: "raw"; readonly source: string };

export type IrTopLevel =
  | IrDb
  | IrFunction
  | IrCommand
  | IrEvent
  | { readonly type: "raw"; readonly source: string };

export interface IrCommand {
  readonly type: "command";
  readonly name: string;
  readonly body: readonly IrStatement[];
}

export interface IrEvent {
  readonly type: "event";
  readonly eventType: "message" | "command";
  readonly command?: string;
  readonly match?: string;
  readonly body: readonly IrStatement[];
}

export interface IrProgram {
  readonly bot?: IrBot;
  readonly databases: readonly IrDb[];
  readonly functions: readonly IrFunction[];
  readonly commands: readonly IrCommand[];
  readonly events: readonly IrEvent[];
  readonly topLevel: readonly IrTopLevel[];
  readonly jsPreamble: readonly string[];
}

export function buildIr(program: ProgramNode): IrProgram {
  const databases: IrDb[] = [];
  const functions: IrFunction[] = [];
  const commands: IrCommand[] = [];
  const events: IrEvent[] = [];
  const topLevel: IrTopLevel[] = [];

  let bot: IrBot | undefined;

  for (const node of program.body) {
    if (node.kind === "Bot") {
      bot = {
        runtime: node.runtime,
        name: node.name,
        config: node.config,
      };
      continue;
    }

    if (node.kind === "Db") {
      const db = { type: "db" as const, name: node.name, fields: node.fields };
      databases.push(db);
      topLevel.push(db);
      continue;
    }

    if (node.kind === "Function") {
      const fn = {
        type: "function" as const,
        name: node.name,
        params: node.params,
        body: toIrStatements(node.body),
        exported: node.exported,
      };
      functions.push(fn);
      topLevel.push(fn);
      continue;
    }

    if (node.kind === "Command") {
      const command = {
        type: "command",
        name: node.name,
        body: toIrStatements(node.body),
      } as const;
      commands.push(command);
      topLevel.push(command);
      continue;
    }

    if (node.kind === "Event") {
      const event = {
        type: "event",
        eventType: node.eventType,
        command: node.command,
        match: node.match,
        body: toIrStatements(node.body),
      } as const;
      events.push(event);
      topLevel.push(event);
      continue;
    }

    if (node.kind === "RawJS") {
      topLevel.push({ type: "raw", source: node.source });
    }
  }

  return {
    bot,
    databases,
    functions,
    commands,
    events,
    topLevel,
    jsPreamble: program.jsPreamble,
  };
}

function toIrStatements(body: readonly StatementNode[]): IrStatement[] {
  const statements: IrStatement[] = [];

  for (const statement of body) {
    if (statement.kind === "Reply") {
      statements.push({ type: "reply", expression: statement.expression });
      continue;
    }

    if (statement.kind === "Log") {
      statements.push({ type: "log", expression: statement.expression });
      continue;
    }

    if (statement.kind === "Send") {
      statements.push({
        type: "send",
        targetExpression: statement.targetExpression,
        messageExpression: statement.messageExpression,
      });
      continue;
    }

    if (statement.kind === "Let") {
      statements.push({
        type: "let",
        declarationKind: statement.declarationKind,
        name: statement.name,
        expression: statement.expression,
      });
      continue;
    }

    if (statement.kind === "Return") {
      statements.push({ type: "return", expression: statement.expression });
      continue;
    }

    if (statement.kind === "Stop") {
      statements.push({ type: "stop" });
      continue;
    }

    if (statement.kind === "Condition") {
      statements.push({
        type: "if",
        condition: statement.expression,
        thenBody: toIrStatements(statement.body),
        elseBody: statement.elseBody ? toIrStatements(statement.elseBody) : undefined,
      });
      continue;
    }

    if (statement.kind === "Loop") {
      statements.push({
        type: "for",
        iterator: statement.iterator,
        iterableExpression: statement.iterableExpression,
        body: toIrStatements(statement.body),
      });
      continue;
    }

    if (statement.kind === "While") {
      statements.push({
        type: "while",
        condition: statement.condition,
        body: toIrStatements(statement.body),
      });
      continue;
    }

    if (statement.kind === "TryCatch") {
      statements.push({
        type: "try",
        catchVar: statement.catchVar,
        tryBody: toIrStatements(statement.tryBody),
        catchBody: toIrStatements(statement.catchBody),
      });
      continue;
    }

    if (statement.kind === "Break") {
      statements.push({ type: "break" });
      continue;
    }

    if (statement.kind === "Continue") {
      statements.push({ type: "continue" });
      continue;
    }

    if (statement.kind === "Insert") {
      statements.push({ type: "insert", table: statement.table, values: statement.values });
      continue;
    }

    if (statement.kind === "Update") {
      statements.push({
        type: "update",
        table: statement.table,
        whereField: statement.whereField,
        whereExpression: statement.whereExpression,
        values: statement.values,
      });
      continue;
    }

    if (statement.kind === "Select") {
      statements.push({
        type: "select",
        table: statement.table,
        whereField: statement.whereField,
        whereExpression: statement.whereExpression,
        rawQuery: statement.rawQuery,
        resultVariable: statement.resultVariable,
        declarationKind: statement.declarationKind,
      });
      continue;
    }

    if (statement.kind === "Delete") {
      statements.push({
        type: "delete",
        table: statement.table,
        whereField: statement.whereField,
        whereExpression: statement.whereExpression,
      });
      continue;
    }

    if (statement.kind === "RawJS") {
      statements.push({ type: "raw", source: statement.source });
      continue;
    }
  }

  return statements;
}
