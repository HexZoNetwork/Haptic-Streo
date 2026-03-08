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

  const functionMatch = header.match(/^func\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\(([^)]*)\))?$/);
  if (functionMatch) {
    body.push(
      createFunctionNode(
        functionMatch[1],
        parseParams(functionMatch[2]),
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
      statements.push(createReplyNode(stripTrailingSemicolon(replyMatch[1])));
      idx += 1;
      continue;
    }

    const logMatch = line.match(/^log\s+(.+)$/);
    if (logMatch) {
      statements.push(createLogNode(stripTrailingSemicolon(logMatch[1])));
      idx += 1;
      continue;
    }

    const sendMatch = line.match(/^send\s+(\S+)\s+(.+)$/);
    if (sendMatch) {
      statements.push(createSendNode(stripTrailingSemicolon(sendMatch[1]), stripTrailingSemicolon(sendMatch[2])));
      idx += 1;
      continue;
    }

    const declarationMatch = line.match(/^(let|const|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
    if (declarationMatch) {
      statements.push(
        createLetNode(
          declarationMatch[2],
          stripTrailingSemicolon(declarationMatch[3]),
          declarationMatch[1] as "let" | "const" | "var",
        ),
      );
      idx += 1;
      continue;
    }

    const returnMatch = line.match(/^return(?:\s+(.+))?$/);
    if (returnMatch) {
      statements.push(createReturnNode(stripTrailingSemicolon(returnMatch[1] ?? "") || undefined));
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
      statements.push(
        createSelectNode(
          selectMatch[1],
          stripTrailingSemicolon(line),
          selectMatch[2],
          selectMatch[3] ? stripTrailingSemicolon(selectMatch[3]) : undefined,
        ),
      );
      idx += 1;
      continue;
    }

    // Keep unknown lines as raw JS so mixed syntax runs without parse failure.
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
    const ifBody = parseStatements(block.lines, block.startLine, errors);

    let elseBody: StatementNode[] | undefined;
    let nextIndex = block.nextIndex;
    const elseIndex = findNextMeaningfulIndex(sourceLines, nextIndex);

    if (elseIndex !== undefined && sourceLines[elseIndex].trim() === "else {") {
      const elseBlock = collectBraceBlock(sourceLines, elseIndex, errors);
      if (elseBlock) {
        elseBody = parseStatements(elseBlock.lines, elseBlock.startLine, errors);
        nextIndex = elseBlock.nextIndex;
      }
    }

    out.push(createConditionNode(stripTrailingSemicolon(ifMatch[1]), ifBody, elseBody));
    return nextIndex;
  }

  const forMatch = header.match(/^for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\s+(.+)$/);
  if (forMatch) {
    out.push(
      createLoopNode(
        forMatch[1],
        stripTrailingSemicolon(forMatch[2]),
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

  // Unknown block inside statements: pass through as raw JS block.
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

    config[match[1]] = stripTrailingSemicolon(match[2]);
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

function parseParams(raw?: string): string[] {
  if (!raw?.trim()) {
    return [];
  }

  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/[^a-zA-Z0-9_]/g, ""));
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
  let depth = 1;
  let i = startIndex + 1;

  while (i < lines.length && depth > 0) {
    const current = lines[i];
    depth += braceDelta(current);

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
    /^func\s+[a-zA-Z_][a-zA-Z0-9_]*\s*(?:\([^)]*\))?\s*\{$/.test(line) ||
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
    /^func\s+[a-zA-Z_][a-zA-Z0-9_]*\s*(?:\([^)]*\))?$/.test(header) ||
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

function braceDelta(line: string): number {
  let delta = 0;
  let inQuote: "'" | '"' | "`" | null = null;
  let escaped = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (inQuote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (ch === "\\") {
        escaped = true;
        continue;
      }

      if (ch === inQuote) {
        inQuote = null;
      }

      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      inQuote = ch;
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
}

function error(code: string, message: string, line?: number): ParserDiagnostic {
  return { code, message, line };
}
