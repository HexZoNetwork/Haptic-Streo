import type { ProgramNode } from "@haptic/ast";
import {
  buildIr,
  type IrCommand,
  type IrEvent,
  type IrFunction,
  type IrProgram,
  type IrStatement,
  type IrTopLevel,
} from "./ir-builder.js";
import { emitGramJsStatements, emitTelegrafStatements, mapExpression } from "./visitors/command-visitor.js";

export interface GenerateJsOptions {
  readonly engine: "telegraf" | "gramjs";
  readonly moduleFormat?: "esm" | "cjs";
}

export function generateJavaScript(program: ProgramNode, options: GenerateJsOptions): string {
  const ir = buildIr(program);
  const runtime = resolveRuntime(ir, options.engine);
  const moduleFormat = options.moduleFormat ?? "esm";

  return runtime === "gramjs" ? generateGramJs(ir, moduleFormat) : generateTelegraf(ir, moduleFormat);
}

function generateTelegraf(ir: IrProgram, moduleFormat: "esm" | "cjs"): string {
  const tokenExpr = toEnvAwareExpression(ir.bot?.config.token, "process.env.BOT_TOKEN");
  const lines: string[] = [];

  if (moduleFormat === "cjs") {
    lines.push('const { Telegraf } = require("telegraf");');
  } else {
    lines.push('import { Telegraf } from "telegraf";');
  }
  lines.push(`const bot = new Telegraf(${tokenExpr});`);

  emitDatabaseRuntime(lines, ir);
  emitTelegrafContextFactory(lines);
  emitTelegrafTopLevel(lines, ir.topLevel, moduleFormat);

  lines.push("bot.launch();");
  return lines.join("\n").trimEnd() + "\n";
}

function generateGramJs(ir: IrProgram, moduleFormat: "esm" | "cjs"): string {
  const apiIdExpr = toEnvAwareExpression(ir.bot?.config.api_id ?? ir.bot?.config.apiId, "process.env.API_ID");
  const apiHashExpr = toEnvAwareExpression(
    ir.bot?.config.api_hash ?? ir.bot?.config.apiHash,
    "process.env.API_HASH",
  );

  const lines: string[] = [];

  if (moduleFormat === "cjs") {
    lines.push('const { TelegramClient } = require("telegram");');
    lines.push('const { StringSession } = require("telegram/sessions");');
    lines.push('const { NewMessage } = require("telegram/events");');
  } else {
    lines.push('import { TelegramClient } from "telegram";');
    lines.push('import { StringSession } from "telegram/sessions";');
    lines.push('import { NewMessage } from "telegram/events";');
  }
  lines.push("");
  lines.push(`const apiId = Number(${apiIdExpr});`);
  lines.push(`const apiHash = String(${apiHashExpr});`);
  lines.push('const stringSession = new StringSession(process.env.STRING_SESSION ?? "");');
  lines.push("const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });");

  emitDatabaseRuntime(lines, ir);
  emitGramJsContextFactory(lines);
  emitGramJsTopLevelPrelude(lines, ir.topLevel, moduleFormat);

  lines.push("async function __hapticMain() {");
  lines.push("  await client.start({});");
  lines.push("  client.addEventHandler(async (event) => {");
  lines.push("    const h = createHapticContext(event, client);");

  emitGramJsHandlerBody(lines, ir.topLevel);

  lines.push("  }, new NewMessage({}));");
  lines.push("  await client.runUntilDisconnected();");
  lines.push("}");
  emitGramJsTopLevelSuffix(lines, ir.topLevel);
  lines.push('__hapticMain().catch((error) => { console.error(error); process.exitCode = 1; });');

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
  lines.push("async function __hapticDbUpdate(table, whereField, whereValue, patch) {");
  lines.push("  const rows = __hapticEnsureTable(table);");
  lines.push("  let updated = 0;");
  lines.push("  for (const row of rows) {");
  lines.push("    if (!whereField || row?.[whereField] === whereValue) {");
  lines.push("      Object.assign(row, patch);");
  lines.push("      updated += 1;");
  lines.push("    }");
  lines.push("  }");
  lines.push("  return updated;");
  lines.push("}");
  lines.push("");
  lines.push("async function __hapticDbSelect(table, whereField, whereValue) {");
  lines.push("  const rows = __hapticEnsureTable(table);");
  lines.push("  if (!whereField) return rows;");
  lines.push("  return rows.filter((row) => row?.[whereField] === whereValue);");
  lines.push("}");
  lines.push("");
  lines.push("async function __hapticDbDelete(table, whereField, whereValue) {");
  lines.push("  const rows = __hapticEnsureTable(table);");
  lines.push("  let deleted = 0;");
  lines.push("  for (let i = rows.length - 1; i >= 0; i -= 1) {");
  lines.push("    if (!whereField || rows[i]?.[whereField] === whereValue) {");
  lines.push("      rows.splice(i, 1);");
  lines.push("      deleted += 1;");
  lines.push("    }");
  lines.push("  }");
  lines.push("  return deleted;");
  lines.push("}");
}

function hasDbStatement(statements: readonly IrStatement[]): boolean {
  for (const statement of statements) {
    if (
      statement.type === "insert" ||
      statement.type === "update" ||
      statement.type === "select" ||
      statement.type === "delete"
    ) {
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

    if (statement.type === "while") {
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

function emitFunction(lines: string[], fn: IrFunction, moduleFormat: "esm" | "cjs"): void {
  const params = fn.params.join(", ");
  const exportPrefix = moduleFormat === "esm" && fn.exported ? "export " : "";
  lines.push(`${exportPrefix}async function ${fn.name}(${params}) {`);
  lines.push(...emitTelegrafStatements(fn.body, "  "));
  lines.push("}");
  if (moduleFormat === "cjs" && fn.exported) {
    lines.push(`exports.${fn.name} = ${fn.name};`);
  }
}

function emitDbInitialization(lines: string[], table: string, fields: readonly unknown[]): void {
  lines.push(`__hapticEnsureTable(${JSON.stringify(table)});`);
  lines.push(`__hapticDbSchema.set(${JSON.stringify(table)}, ${JSON.stringify(fields)});`);
}

function emitTelegrafTopLevel(lines: string[], topLevel: readonly IrTopLevel[], moduleFormat: "esm" | "cjs"): void {
  for (const item of topLevel) {
    if (item.type === "raw") {
      lines.push(item.source);
      continue;
    }

    if (item.type === "db") {
      emitDbInitialization(lines, item.name, item.fields);
      lines.push("");
      continue;
    }

    if (item.type === "function") {
      emitFunction(lines, item, moduleFormat);
      lines.push("");
      continue;
    }

    if (item.type === "command") {
      emitTelegrafCommand(lines, item);
      continue;
    }

    emitTelegrafEvent(lines, item);
  }
}

function emitGramJsTopLevelPrelude(lines: string[], topLevel: readonly IrTopLevel[], moduleFormat: "esm" | "cjs"): void {
  for (const item of topLevel) {
    if (item.type === "db") {
      emitDbInitialization(lines, item.name, item.fields);
      lines.push("");
      continue;
    }

    if (item.type === "function") {
      emitFunction(lines, item, moduleFormat);
      lines.push("");
    }
  }
}

function emitGramJsHandlerBody(lines: string[], topLevel: readonly IrTopLevel[]): void {
  for (const item of topLevel) {
    if (item.type === "command") {
      lines.push(`  if (${commandRegex(item.name)}.test(h.message.text)) {`);
      lines.push(...emitGramJsStatements(item.body, "    "));
      lines.push("  }");
      continue;
    }

    if (item.type === "event") {
      emitGramJsEvent(lines, item);
    }
  }
}

function emitGramJsTopLevelSuffix(lines: string[], topLevel: readonly IrTopLevel[]): void {
  const rawStatements = topLevel.filter((item): item is Extract<IrTopLevel, { type: "raw" }> => item.type === "raw");
  if (rawStatements.length === 0) {
    return;
  }

  lines.push("");
  for (const item of rawStatements) {
    lines.push(item.source);
  }
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
