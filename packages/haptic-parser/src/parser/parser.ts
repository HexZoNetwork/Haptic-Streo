import {
  createBotNode,
  createCommandNode,
  createConditionNode,
  createDbNode,
  createEventNode,
  createFunctionNode,
  createInsertNode,
  createLetNode,
  createLogNode,
  createProgramNode,
  createRawJsNode,
  createReplyNode,
  createReturnNode,
  createSelectNode,
  createSendNode,
  createStopNode,
  createTryCatchNode,
  createLoopNode,
  type DbField,
  type ProgramNode,
  type StatementNode,
} from "@haptic/ast";
import { parseExpression } from "./expression-parser.js";

export interface ParserDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly line?: number;
}

export interface ParseResult {
  readonly ast: ProgramNode;
  readonly lexErrors: readonly ParserDiagnostic[];
  readonly parseErrors: readonly ParserDiagnostic[];
}

interface CollectedBlock {
  header: string;
  lines: string[];
  nextIndex: number;
  startLine: number;
}

interface BraceScannerState {
  inQuote: "'" | '"' | "`" | null;
  escaped: boolean;
  inBlockComment: boolean;
}

export function parseDsl(source: string): ParseResult {
  const parseErrors: ParserDiagnostic[] = [];
  const body: StatementNode[] = [];
  const jsPreamble: string[] = [];

  const normalized = preprocessColonSyntax(source.replace(/^\uFEFF/, ""));
  const lines = normalized.split(/\r?\n/);

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      jsPreamble.push(rawLine);
      i += 1;
      continue;
    }

    if (line.startsWith("//")) {
      jsPreamble.push(rawLine);
      i += 1;
      continue;
    }

    if (!isTopLevelBlockStart(line)) {
      if (looksLikeMalformedTopLevelDsl(line)) {
        parseErrors.push(error("HPT1001", `Malformed top-level DSL block: ${line}`, i + 1));
      }
      jsPreamble.push(rawLine);
      i += 1;
      continue;
    }

    const block = collectBraceBlock(lines, i, parseErrors);
    if (!block) {
      break;
    }

    parseTopLevelBlock(block, body, parseErrors);
    i = block.nextIndex;
  }

  return {
    ast: createProgramNode(body, jsPreamble),
    lexErrors: [],
    parseErrors,
  };
}

function parseTopLevelBlock(
  block: CollectedBlock,
  body: StatementNode[],
  errors: ParserDiagnostic[],
): void {
  const header = block.header;

  const botMatch = header.match(/^bot\s+"([^"]+)"$/);
  if (botMatch) {
    body.push(createBotNode("bot", botMatch[1], parseAssignments(block.lines, block.startLine, errors)));
    return;
  }

  const userbotMatch = header.match(/^userbot\s+"([^"]+)"$/);
  if (userbotMatch) {
    body.push(createBotNode("userbot", userbotMatch[1], parseAssignments(block.lines, block.startLine, errors)));
    return;
  }

  const commandMatch = header.match(/^command\s+([a-zA-Z_][a-zA-Z0-9_]*)$/);
  if (commandMatch) {
    body.push(createCommandNode(commandMatch[1], parseStatements(block.lines, block.startLine, errors)));
    return;
  }

  const onMessageMatch = header.match(/^on\s+message(?:\s+match\s+(.+))?$/);
  if (onMessageMatch) {
    body.push(createEventNode("message", parseStatements(block.lines, block.startLine, errors), undefined, onMessageMatch[1]?.trim()));
    return;
  }

  const onCommandMatch = header.match(/^on\s+command\s+(.+)$/);
  if (onCommandMatch) {
    body.push(
      createEventNode(
        "command",
        parseStatements(block.lines, block.startLine, errors),
        normalizeCommandLiteral(onCommandMatch[1].trim()),
      ),
    );
    return;
  }

  const functionMatch = header.match(/^(?:func|fn)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\(([^)]*)\))?$/);
  if (functionMatch) {
    const params = parseParams(functionMatch[2], block.startLine, errors);
    body.push(
      createFunctionNode(
        functionMatch[1],
        params,
        parseStatements(block.lines, block.startLine, errors),
      ),
    );
    return;
  }

  const dbMatch = header.match(/^db\s+([a-zA-Z_][a-zA-Z0-9_]*)$/);
  if (dbMatch) {
    body.push(createDbNode(dbMatch[1], parseDbFields(block.lines, block.startLine, errors)));
    return;
  }

  errors.push(error("HPT1005", `Unknown block header: ${header}`, block.startLine));
}

function parseStatements(
  lines: string[],
  startLine: number,
  errors: ParserDiagnostic[],
): StatementNode[] {
  const statements: StatementNode[] = [];

  let idx = 0;
  while (idx < lines.length) {
    const rawLine = lines[idx];
    const line = rawLine.trim();

    if (!line || line.startsWith("//")) {
      idx += 1;
      continue;
    }

    if (line.endsWith("{")) {
      const block = collectBraceBlock(lines, idx, errors, startLine - 1);
      if (!block) {
        break;
      }

      const handled = parseStatementBlock(block, lines, errors, statements);
      idx = handled;
      continue;
    }

    const replyMatch = line.match(/^reply\s+(.+)$/);
    if (replyMatch) {
      const expression = parseInlineExpression(stripTrailingSemicolon(replyMatch[1]), startLine + idx, errors, "reply");
      if (expression) {
        statements.push(createReplyNode(expression));
      }
      idx += 1;
      continue;
    }

    const logMatch = line.match(/^log\s+(.+)$/);
    if (logMatch) {
      const expression = parseInlineExpression(stripTrailingSemicolon(logMatch[1]), startLine + idx, errors, "log");
      if (expression) {
        statements.push(createLogNode(expression));
      }
      idx += 1;
      continue;
    }

    const sendMatch = line.match(/^send\s+(\S+)\s+(.+)$/);
    if (sendMatch) {
      const targetExpression = parseInlineExpression(stripTrailingSemicolon(sendMatch[1]), startLine + idx, errors, "send target");
      const messageExpression = parseInlineExpression(
        stripTrailingSemicolon(sendMatch[2]),
        startLine + idx,
        errors,
        "send message",
      );
      if (targetExpression && messageExpression) {
        statements.push(createSendNode(targetExpression, messageExpression));
      }
      idx += 1;
      continue;
    }

    const declarationMatch = line.match(/^(let|const|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
    if (declarationMatch) {
      const expression = parseInlineExpression(
        stripTrailingSemicolon(declarationMatch[3]),
        startLine + idx,
        errors,
        `${declarationMatch[1]} initializer`,
      );
      if (!expression) {
        idx += 1;
        continue;
      }
      statements.push(
        createLetNode(
          declarationMatch[2],
          expression,
          declarationMatch[1] as "let" | "const" | "var",
        ),
      );
      idx += 1;
      continue;
    }

    const returnMatch = line.match(/^return(?:\s+(.+))?$/);
    if (returnMatch) {
      const rawExpression = stripTrailingSemicolon(returnMatch[1] ?? "");
      const expression = rawExpression
        ? parseInlineExpression(rawExpression, startLine + idx, errors, "return")
        : undefined;
      statements.push(createReturnNode(expression || undefined));
      idx += 1;
      continue;
    }

    if (line === "stop") {
      statements.push(createStopNode());
      idx += 1;
      continue;
    }

    const selectMatch = line.match(/^select\s+\*\s+from\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s+where\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+))?$/i);
    if (selectMatch) {
      const whereExpression = selectMatch[3]
        ? parseInlineExpression(stripTrailingSemicolon(selectMatch[3]), startLine + idx, errors, "select where")
        : undefined;
      statements.push(
        createSelectNode(
          selectMatch[1],
          stripTrailingSemicolon(line),
          selectMatch[2],
          whereExpression,
        ),
      );
      idx += 1;
      continue;
    }

    const dslError = classifyMalformedStatement(line);
    if (dslError) {
      errors.push(error(dslError.code, dslError.message, startLine + idx));
      idx += 1;
      continue;
    }

    statements.push(createRawJsNode(stripTrailingSemicolon(rawLine)));
    idx += 1;
  }

  return statements;
}

function parseStatementBlock(
  block: CollectedBlock,
  sourceLines: string[],
  errors: ParserDiagnostic[],
  out: StatementNode[],
): number {
  const header = block.header;

  const ifMatch = header.match(/^if\s+(.+)$/);
  if (ifMatch) {
    const condition = parseInlineExpression(stripTrailingSemicolon(ifMatch[1]), block.startLine - 1, errors, "if");
    const ifBody = parseStatements(block.lines, block.startLine, errors);

    let elseBody: StatementNode[] | undefined;
    let nextIndex = block.nextIndex;
    const elseIndex = findNextMeaningfulIndex(sourceLines, nextIndex);

    if (elseIndex !== undefined) {
      const elseHeader = sourceLines[elseIndex].trim();
      if (elseHeader === "else {") {
        const elseBlock = collectBraceBlock(sourceLines, elseIndex, errors);
        if (elseBlock) {
          elseBody = parseStatements(elseBlock.lines, elseBlock.startLine, errors);
          nextIndex = elseBlock.nextIndex;
        }
      } else {
        const elseIfHeader = normalizeElseIfHeader(elseHeader);
        if (elseIfHeader) {
          const elseIfBlock = collectBraceBlock(sourceLines, elseIndex, errors);
          if (elseIfBlock) {
            const nested: StatementNode[] = [];
            const normalizedBlock: CollectedBlock = {
              ...elseIfBlock,
              header: elseIfHeader,
            };
            nextIndex = parseStatementBlock(normalizedBlock, sourceLines, errors, nested);
            elseBody = nested;
          }
        }
      }
    }

    if (condition) {
      out.push(createConditionNode(condition, ifBody, elseBody));
    }
    return nextIndex;
  }

  const forMatch = header.match(/^for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\s+(.+)$/);
  if (forMatch) {
    const iterableExpression = parseInlineExpression(
      stripTrailingSemicolon(forMatch[2]),
      block.startLine - 1,
      errors,
      "for iterable",
    );
    if (!iterableExpression) {
      return block.nextIndex;
    }
    out.push(
      createLoopNode(
        forMatch[1],
        iterableExpression,
        parseStatements(block.lines, block.startLine, errors),
      ),
    );
    return block.nextIndex;
  }

  const tryMatch = header.match(/^try$/);
  if (tryMatch) {
    const tryBody = parseStatements(block.lines, block.startLine, errors);
    const catchIndex = findNextMeaningfulIndex(sourceLines, block.nextIndex);

    if (catchIndex === undefined) {
      errors.push(error("HPT1012", "Expected catch block after try block", block.startLine));
      out.push(createTryCatchNode(tryBody, "err", []));
      return block.nextIndex;
    }

    const catchHeader = sourceLines[catchIndex].trim();
    const catchMatch = catchHeader.match(/^catch(?:\s+([a-zA-Z_][a-zA-Z0-9_]*))?\s*\{$/);
    if (!catchMatch) {
      errors.push(error("HPT1012", "Expected catch block after try block", block.startLine));
      out.push(createTryCatchNode(tryBody, "err", []));
      return block.nextIndex;
    }

    const catchBlock = collectBraceBlock(sourceLines, catchIndex, errors);
    if (!catchBlock) {
      out.push(createTryCatchNode(tryBody, catchMatch[1] ?? "err", []));
      return block.nextIndex;
    }

    out.push(
      createTryCatchNode(
        tryBody,
        catchMatch[1] ?? "err",
        parseStatements(catchBlock.lines, catchBlock.startLine, errors),
      ),
    );

    return catchBlock.nextIndex;
  }

  const insertMatch = header.match(/^insert\s+([a-zA-Z_][a-zA-Z0-9_]*)$/);
  if (insertMatch) {
    out.push(createInsertNode(insertMatch[1], parseAssignments(block.lines, block.startLine, errors)));
    return block.nextIndex;
  }

  const asRaw = `${header} {\n${block.lines.join("\n")}\n}`;
  out.push(createRawJsNode(asRaw));
  return block.nextIndex;
}

function parseAssignments(
  lines: string[],
  startLine: number,
  errors: ParserDiagnostic[],
): Readonly<Record<string, string>> {
  const config: Record<string, string> = {};

  for (let idx = 0; idx < lines.length; idx += 1) {
    const trimmed = lines[idx].trim();
    if (!trimmed || trimmed.startsWith("//")) {
      continue;
    }

    const match = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
    if (!match) {
      errors.push(error("HPT1006", `Invalid assignment: ${trimmed}`, startLine + idx));
      continue;
    }

    if (Object.hasOwn(config, match[1])) {
      errors.push(error("HPT1007", `Duplicate assignment key: ${match[1]}`, startLine + idx));
      continue;
    }

    const expression = parseInlineExpression(stripTrailingSemicolon(match[2]), startLine + idx, errors, `assignment ${match[1]}`);
    if (!expression) {
      continue;
    }

    config[match[1]] = expression;
  }

  return config;
}

function parseDbFields(lines: string[], startLine: number, errors: ParserDiagnostic[]): DbField[] {
  const fields: DbField[] = [];

  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx].trim();
    if (!line || line.startsWith("//")) {
      continue;
    }

    const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)$/);
    if (!match) {
      errors.push(error("HPT1010", `Invalid db field: ${line}`, startLine + idx));
      continue;
    }

    fields.push({ name: match[1], dataType: match[2] });
  }

  return fields;
}

function parseParams(raw: string | undefined, line: number, errors: ParserDiagnostic[]): string[] {
  if (!raw?.trim()) {
    return [];
  }

  const params: string[] = [];
  const seen = new Set<string>();

  for (const part of raw.split(",")) {
    const param = part.trim();
    if (!param) {
      continue;
    }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(param)) {
      errors.push(error("HPT1013", `Invalid function parameter: ${param}`, line));
      continue;
    }
    if (seen.has(param)) {
      errors.push(error("HPT1014", `Duplicate function parameter: ${param}`, line));
      continue;
    }
    seen.add(param);
    params.push(param);
  }

  return params;
}

function collectBraceBlock(
  lines: string[],
  startIndex: number,
  errors: ParserDiagnostic[],
  baseLineOffset = 0,
): CollectedBlock | undefined {
  const startLineRaw = lines[startIndex] ?? "";
  const startLine = startLineRaw.trim();
  if (!startLine.endsWith("{")) {
    errors.push(error("HPT1003", `Expected block start: ${startLine}`, baseLineOffset + startIndex + 1));
    return undefined;
  }

  const header = startLine.slice(0, -1).trim();
  const blockLines: string[] = [];
  const scanner = createBraceScanner();
  let depth = 1;
  let i = startIndex + 1;

  while (i < lines.length && depth > 0) {
    const current = lines[i];
    depth += scanner(current);

    if (depth > 0) {
      blockLines.push(current);
    }

    i += 1;
  }

  if (depth !== 0) {
    errors.push(error("HPT1004", `Unbalanced braces in block: ${header}`, baseLineOffset + startIndex + 1));
    return undefined;
  }

  return {
    header,
    lines: blockLines,
    nextIndex: i,
    startLine: baseLineOffset + startIndex + 2,
  };
}

function findNextMeaningfulIndex(lines: string[], start: number): number | undefined {
  for (let i = start; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith("//")) {
      continue;
    }

    return i;
  }

  return undefined;
}

function isTopLevelBlockStart(line: string): boolean {
  return (
    /^bot\s+"[^"]+"\s*\{$/.test(line) ||
    /^userbot\s+"[^"]+"\s*\{$/.test(line) ||
    /^command\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\{$/.test(line) ||
    /^on\s+(message|command)\b.*\{$/.test(line) ||
    /^(?:func|fn)\s+[a-zA-Z_][a-zA-Z0-9_]*\s*(?:\([^)]*\))?\s*\{$/.test(line) ||
    /^db\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\{$/.test(line)
  );
}

function preprocessColonSyntax(source: string): string {
  const lines = source.split(/\r?\n/);
  const output: string[] = [];

  for (const originalLine of lines) {
    const trimmed = originalLine.trim();
    const indentMatch = originalLine.match(/^\s*/);
    const indent = indentMatch ? indentMatch[0] : "";

    if (/^else\s*:$/.test(trimmed)) {
      output.push(`${indent}}`);
      output.push(`${indent}else {`);
      continue;
    }

    const elseIf = trimmed.match(/^(?:else\s+if|elseif|elif)\s+(.+):$/);
    if (elseIf) {
      output.push(`${indent}}`);
      output.push(`${indent}else if ${elseIf[1].trim()} {`);
      continue;
    }

    if (/^catch(?:\s+[a-zA-Z_][a-zA-Z0-9_]*)?\s*:$/.test(trimmed)) {
      output.push(`${indent}}`);
      output.push(`${indent}${trimmed.slice(0, -1).trim()} {`);
      continue;
    }

    if (/^end\s*$/.test(trimmed)) {
      output.push(`${indent}}`);
      continue;
    }

    if (isConvertibleColonHeader(trimmed)) {
      output.push(`${indent}${trimmed.slice(0, -1).trim()} {`);
      continue;
    }

    output.push(originalLine);
  }

  return output.join("\n");
}

function isConvertibleColonHeader(trimmed: string): boolean {
  if (!trimmed.endsWith(":")) {
    return false;
  }

  const header = trimmed.slice(0, -1).trim();
  return (
    /^bot\s+"[^"]+"$/.test(header) ||
    /^userbot\s+"[^"]+"$/.test(header) ||
    /^command\s+[a-zA-Z_][a-zA-Z0-9_]*$/.test(header) ||
    /^on\s+(message|command)\b.*$/.test(header) ||
    /^(?:func|fn)\s+[a-zA-Z_][a-zA-Z0-9_]*\s*(?:\([^)]*\))?$/.test(header) ||
    /^db\s+[a-zA-Z_][a-zA-Z0-9_]*$/.test(header) ||
    /^if\s+.+$/.test(header) ||
    /^try$/.test(header) ||
    /^for\s+[a-zA-Z_][a-zA-Z0-9_]*\s+in\s+.+$/.test(header) ||
    /^insert\s+[a-zA-Z_][a-zA-Z0-9_]*$/.test(header)
  );
}

function normalizeCommandLiteral(input: string): string {
  const stripped = stripTrailingSemicolon(input).trim();
  const quoted = stripped.match(/^"([^"]+)"$/);
  if (quoted) {
    return quoted[1].replace(/^\//, "");
  }

  return stripped.replace(/^\//, "");
}

function stripTrailingSemicolon(value: string): string {
  return value.replace(/;$/, "").trim();
}

function parseInlineExpression(
  source: string,
  line: number,
  errors: ParserDiagnostic[],
  label: string,
): string | undefined {
  try {
    return parseExpression(source);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    errors.push(error("HPT1008", `${label}: ${message}`, line));
    return undefined;
  }
}

function normalizeElseIfHeader(header: string): string | undefined {
  const elseIf = header.match(/^(?:else\s+if|elseif|elif)\s+(.+)\s*\{$/);
  if (!elseIf) {
    return undefined;
  }
  return `if ${elseIf[1].trim()}`;
}

function looksLikeMalformedTopLevelDsl(line: string): boolean {
  return (
    (/^(?:bot|userbot)\s+/.test(line) ||
      /^command\s+/.test(line) ||
      /^on\s+/.test(line) ||
      /^(?:func|fn)\s+/.test(line) ||
      /^db\s+/.test(line)) &&
    !isTopLevelBlockStart(line)
  );
}

function classifyMalformedStatement(line: string): ParserDiagnostic | undefined {
  if (/^(reply|log|send)\s*$/.test(line)) {
    return { code: "HPT1009", message: `Missing expression for statement: ${line.trim()}` };
  }

  if (/^(let|const|var)\b/.test(line) && !/^(let|const|var)\s+[a-zA-Z_][a-zA-Z0-9_]*\s*=/.test(line)) {
    return { code: "HPT1011", message: `Invalid variable declaration: ${line.trim()}` };
  }

  if (/^(elseif|elif)\b/.test(line) && !line.endsWith("{")) {
    return { code: "HPT1015", message: `Malformed DSL statement: ${line.trim()}` };
  }

  return undefined;
}

function createBraceScanner(): (line: string) => number {
  const state: BraceScannerState = {
    inQuote: null,
    escaped: false,
    inBlockComment: false,
  };

  return (line: string): number => {
    let delta = 0;

    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      const next = line[i + 1];

      if (state.inBlockComment) {
        if (ch === "*" && next === "/") {
          state.inBlockComment = false;
          i += 1;
        }
        continue;
      }

      if (state.inQuote) {
        if (state.escaped) {
          state.escaped = false;
          continue;
        }

        if (ch === "\\") {
          state.escaped = true;
          continue;
        }

        if (ch === state.inQuote) {
          state.inQuote = null;
        }

        continue;
      }

      if (ch === "/" && next === "/") {
        break;
      }

      if (ch === "/" && next === "*") {
        state.inBlockComment = true;
        i += 1;
        continue;
      }

      if (ch === '"' || ch === "'" || ch === "`") {
        state.inQuote = ch;
        state.escaped = false;
        continue;
      }

      if (ch === "{") {
        delta += 1;
        continue;
      }

      if (ch === "}") {
        delta -= 1;
      }
    }

    return delta;
  };
}

function error(code: string, message: string, line?: number): ParserDiagnostic {
  return { code, message, line };
}
