import type { ProgramNode } from "@haptic/ast";
import {
  buildIr,
  type IrCommand,
  type IrEvent,
  type IrFunction,
  type IrProgram,
  type IrStatement,
} from "./ir-builder.js";
import { emitGramJsStatements, emitTelegrafStatements, mapExpression } from "./visitors/command-visitor.js";

export interface GenerateJsOptions {
  readonly engine: "telegraf" | "gramjs";
}

export function generateJavaScript(program: ProgramNode, options: GenerateJsOptions): string {
  const ir = buildIr(program);
  const runtime = resolveRuntime(ir, options.engine);

  return runtime === "gramjs" ? generateGramJs(ir) : generateTelegraf(ir);
}

function generateTelegraf(ir: IrProgram): string {
  const tokenExpr = toEnvAwareExpression(ir.bot?.config.token, "process.env.BOT_TOKEN");
  const lines: string[] = [];

  lines.push('import { Telegraf } from "telegraf";');
  lines.push(`const bot = new Telegraf(${tokenExpr});`);

  emitDatabaseRuntime(lines, ir);
  emitJsPreamble(lines, ir);
  emitSharedFunctions(lines, ir);
  emitTelegrafContextFactory(lines);

  for (const command of ir.commands) {
    emitTelegrafCommand(lines, command);
  }

  for (const event of ir.events) {
    emitTelegrafEvent(lines, event);
  }

  lines.push("bot.launch();");
  return lines.join("\n").trimEnd() + "\n";
}

function generateGramJs(ir: IrProgram): string {
  const apiIdExpr = toEnvAwareExpression(ir.bot?.config.api_id ?? ir.bot?.config.apiId, "process.env.API_ID");
  const apiHashExpr = toEnvAwareExpression(
    ir.bot?.config.api_hash ?? ir.bot?.config.apiHash,
    "process.env.API_HASH",
  );

  const lines: string[] = [];

  lines.push('import { TelegramClient } from "telegram";');
  lines.push('import { StringSession } from "telegram/sessions/index.js";');
  lines.push('import { NewMessage } from "telegram/events/NewMessage.js";');
  lines.push("");
  lines.push(`const apiId = Number(${apiIdExpr});`);
  lines.push(`const apiHash = String(${apiHashExpr});`);
  lines.push('const stringSession = new StringSession(process.env.STRING_SESSION ?? "");');
  lines.push("const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });");

  emitDatabaseRuntime(lines, ir);
  emitJsPreamble(lines, ir);
  emitSharedFunctions(lines, ir);
  emitGramJsContextFactory(lines);

  lines.push("await client.start({});");
  lines.push("client.addEventHandler(async (event) => {");
  lines.push("  const h = createHapticContext(event, client);");

  for (const command of ir.commands) {
    lines.push(`  if (${commandRegex(command.name)}.test(h.message.text)) {`);
    lines.push(...emitGramJsStatements(command.body, "    "));
    lines.push("  }");
  }

  for (const event of ir.events) {
    emitGramJsEvent(lines, event);
  }

  lines.push("}, new NewMessage({}));");
  lines.push("await client.runUntilDisconnected();");

  return lines.join("\n").trimEnd() + "\n";
}

function emitDatabaseRuntime(lines: string[], ir: IrProgram): void {
  const needsDbRuntime =
    ir.databases.length > 0 ||
    ir.commands.some((c) => hasDbStatement(c.body)) ||
    ir.events.some((e) => hasDbStatement(e.body)) ||
    ir.functions.some((f) => hasDbStatement(f.body));

  if (!needsDbRuntime) {
    return;
  }

  lines.push("");
  lines.push("const __hapticDb = new Map();");
  lines.push("const __hapticDbSchema = new Map();");
  lines.push("");
  lines.push("function __hapticEnsureTable(name) {");
  lines.push("  if (!__hapticDb.has(name)) __hapticDb.set(name, []);");
  lines.push("  return __hapticDb.get(name);");
  lines.push("}");
  lines.push("");
  lines.push("function __hapticDbInsert(table, row) {");
  lines.push("  const rows = __hapticEnsureTable(table);");
  lines.push("  rows.push(row);");
  lines.push("  return row;");
  lines.push("}");
  lines.push("");
  lines.push("async function __hapticDbSelect(table, whereField, whereValue) {");
  lines.push("  const rows = __hapticEnsureTable(table);");
  lines.push("  if (!whereField) return rows;");
  lines.push("  return rows.filter((row) => row?.[whereField] === whereValue);");
  lines.push("}");

  if (ir.databases.length > 0) {
    lines.push("");
    for (const db of ir.databases) {
      lines.push(`__hapticEnsureTable(${JSON.stringify(db.name)});`);
      lines.push(`__hapticDbSchema.set(${JSON.stringify(db.name)}, ${JSON.stringify(db.fields)});`);
    }
  }
}

function hasDbStatement(statements: readonly IrStatement[]): boolean {
  for (const statement of statements) {
    if (statement.type === "insert" || statement.type === "select") {
      return true;
    }

    if (statement.type === "if") {
      const thenBody = statement.thenBody ?? [];
      const elseBody = statement.elseBody ?? [];
      if (hasDbStatement(thenBody) || hasDbStatement(elseBody)) {
        return true;
      }
    }

    if (statement.type === "for") {
      const body = statement.body ?? [];
      if (hasDbStatement(body)) {
        return true;
      }
    }

    if (statement.type === "try") {
      const tryBody = statement.tryBody ?? [];
      const catchBody = statement.catchBody ?? [];
      if (hasDbStatement(tryBody) || hasDbStatement(catchBody)) {
        return true;
      }
    }
  }

  return false;
}

function emitSharedFunctions(lines: string[], ir: IrProgram): void {
  if (ir.functions.length === 0) {
    return;
  }

  lines.push("");
  for (const fn of ir.functions) {
    emitFunction(lines, fn);
    lines.push("");
  }
}

function emitFunction(lines: string[], fn: IrFunction): void {
  const params = fn.params.join(", ");
  lines.push(`async function ${fn.name}(${params}) {`);
  lines.push(...emitTelegrafStatements(fn.body, "  "));
  lines.push("}");
}

function emitTelegrafContextFactory(lines: string[]): void {
  lines.push("");
  lines.push("function createHapticContext(ctx) {");
  lines.push("  return {");
  lines.push("    message: {");
  lines.push("      text: ctx.message?.text ?? \"\",");
  lines.push("      id: ctx.message?.message_id,");
  lines.push("    },");
  lines.push("    chat: { id: ctx.chat?.id },");
  lines.push("    user: {");
  lines.push("      id: ctx.from?.id,");
  lines.push("      username: ctx.from?.username ?? \"\",");
  lines.push("    },");
  lines.push("    reply: async (value) => ctx.reply(String(value)),");
  lines.push("    send: async (chatId, value) => ctx.telegram.sendMessage(chatId, String(value)),");
  lines.push("  };\n}");
  lines.push("");
}

function emitGramJsContextFactory(lines: string[]): void {
  lines.push("");
  lines.push("function createHapticContext(event, client) {");
  lines.push("  return {");
  lines.push("    message: {");
  lines.push("      text: event.message?.message ?? \"\",");
  lines.push("      id: event.message?.id,");
  lines.push("    },");
  lines.push("    chat: { id: event.chatId },");
  lines.push("    user: {");
  lines.push("      id: event.senderId,");
  lines.push("      username: event.message?.sender?.username ?? \"\",");
  lines.push("    },");
  lines.push("    reply: async (value) => event.message?.reply({ message: String(value) }),");
  lines.push("    send: async (chatId, value) => client.sendMessage(chatId, { message: String(value) }),");
  lines.push("  };\n}");
  lines.push("");
}

function emitTelegrafCommand(lines: string[], command: IrCommand): void {
  lines.push(`bot.command(${JSON.stringify(normalizeCommandName(command.name))}, async (ctx) => {`);
  lines.push("  const h = createHapticContext(ctx);");
  lines.push(...emitTelegrafStatements(command.body, "  "));
  lines.push("});");
  lines.push("");
}

function emitTelegrafEvent(lines: string[], event: IrEvent): void {
  if (event.eventType === "command" && event.command) {
    lines.push(`bot.command(${JSON.stringify(normalizeCommandName(event.command))}, async (ctx) => {`);
    lines.push("  const h = createHapticContext(ctx);");

    if (event.match) {
      lines.push(`  if (!(${buildMatchTest(event.match, "h.message.text")})) return;`);
    }

    lines.push(...emitTelegrafStatements(event.body, "  "));
    lines.push("});");
    lines.push("");
    return;
  }

  lines.push('bot.on("message", async (ctx) => {');
  lines.push("  const h = createHapticContext(ctx);");

  if (event.match) {
    lines.push(`  if (!(${buildMatchTest(event.match, "h.message.text")})) return;`);
  }

  lines.push(...emitTelegrafStatements(event.body, "  "));
  lines.push("});");
  lines.push("");
}

function emitGramJsEvent(lines: string[], event: IrEvent): void {
  if (event.eventType === "command" && event.command) {
    lines.push(`  if (${commandRegex(event.command)}.test(h.message.text)) {`);

    if (event.match) {
      lines.push(`    if (!(${buildMatchTest(event.match, "h.message.text")})) return;`);
    }

    lines.push(...emitGramJsStatements(event.body, "    "));
    lines.push("  }");
    return;
  }

  if (event.match) {
    lines.push(`  if (!(${buildMatchTest(event.match, "h.message.text")})) return;`);
  }

  lines.push(...emitGramJsStatements(event.body, "  "));
}

function emitJsPreamble(lines: string[], ir: IrProgram): void {
  if (ir.jsPreamble.length === 0) {
    return;
  }

  lines.push("");
  lines.push("// JavaScript passthrough");
  lines.push(...ir.jsPreamble);
}

function resolveRuntime(ir: IrProgram, fallback: "telegraf" | "gramjs"): "telegraf" | "gramjs" {
  if (ir.bot?.runtime === "userbot") return "gramjs";
  if (ir.bot?.runtime === "bot") return "telegraf";
  return fallback;
}

function toEnvAwareExpression(expression: string | undefined, fallback: string): string {
  const value = expression?.trim() ? expression.trim() : fallback;
  return mapExpression(value);
}

function normalizeCommandName(command: string): string {
  return command.replace(/^\//, "");
}

function commandRegex(command: string): string {
  const normalized = normalizeCommandName(command).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return `/^\\/${normalized}(?:\\s|$)/`;
}

function buildMatchTest(match: string, subject: string): string {
  const trimmed = match.trim();
  if (/^\/.+\/[gimsuy]*$/.test(trimmed)) return `${trimmed}.test(${subject})`;
  return `new RegExp(${JSON.stringify(trimmed)}).test(${subject})`;
}
