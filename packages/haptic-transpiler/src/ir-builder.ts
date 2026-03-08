import type { DbField, ProgramNode, StatementNode } from "@haptic/ast";

export interface IrBot {
  readonly runtime: "bot" | "userbot";
  readonly name: string;
  readonly config: Readonly<Record<string, string>>;
}

export interface IrDb {
  readonly name: string;
  readonly fields: readonly DbField[];
}

export interface IrFunction {
  readonly name: string;
  readonly params: readonly string[];
  readonly body: readonly IrStatement[];
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
      readonly type: "try";
      readonly catchVar: string;
      readonly tryBody: readonly IrStatement[];
      readonly catchBody: readonly IrStatement[];
    }
  | {
      readonly type: "insert";
      readonly table: string;
      readonly values: Readonly<Record<string, string>>;
    }
  | {
      readonly type: "select";
      readonly table: string;
      readonly whereField?: string;
      readonly whereExpression?: string;
      readonly rawQuery: string;
    }
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
  readonly jsPreamble: readonly string[];
}

export function buildIr(program: ProgramNode): IrProgram {
  const databases: IrDb[] = [];
  const functions: IrFunction[] = [];
  const commands: IrCommand[] = [];
  const events: IrEvent[] = [];

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
      databases.push({ name: node.name, fields: node.fields });
      continue;
    }

    if (node.kind === "Function") {
      functions.push({
        name: node.name,
        params: node.params,
        body: toIrStatements(node.body),
      });
      continue;
    }

    if (node.kind === "Command") {
      commands.push({
        type: "command",
        name: node.name,
        body: toIrStatements(node.body),
      });
      continue;
    }

    if (node.kind === "Event") {
      events.push({
        type: "event",
        eventType: node.eventType,
        command: node.command,
        match: node.match,
        body: toIrStatements(node.body),
      });
    }
  }

  return {
    bot,
    databases,
    functions,
    commands,
    events,
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

    if (statement.kind === "TryCatch") {
      statements.push({
        type: "try",
        catchVar: statement.catchVar,
        tryBody: toIrStatements(statement.tryBody),
        catchBody: toIrStatements(statement.catchBody),
      });
      continue;
    }

    if (statement.kind === "Insert") {
      statements.push({ type: "insert", table: statement.table, values: statement.values });
      continue;
    }

    if (statement.kind === "Select") {
      statements.push({
        type: "select",
        table: statement.table,
        whereField: statement.whereField,
        whereExpression: statement.whereExpression,
        rawQuery: statement.rawQuery,
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
