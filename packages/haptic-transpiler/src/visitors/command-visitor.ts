import type { IrStatement } from "../ir-builder.js";

export function emitTelegrafStatements(statements: readonly IrStatement[], indent = ""): string[] {
  return emitStatements(statements, indent);
}

export function emitGramJsStatements(statements: readonly IrStatement[], indent = ""): string[] {
  return emitStatements(statements, indent);
}

export function mapExpression(expression: string): string {
  const source = expression.trim();
  let output = "";
  let i = 0;

  while (i < source.length) {
    const ch = source[i];

    if (startsLineComment(source, i)) {
      output += source.slice(i);
      break;
    }

    if (startsBlockComment(source, i)) {
      const end = source.indexOf("*/", i + 2);
      if (end === -1) {
        output += source.slice(i);
        break;
      }
      output += source.slice(i, end + 2);
      i = end + 2;
      continue;
    }

    if (isQuote(ch)) {
      const end = consumeQuoted(source, i);
      output += source.slice(i, end);
      i = end;
      continue;
    }

    if (ch === "/" && isRegexStart(source, i)) {
      const end = consumeRegexLiteral(source, i);
      output += source.slice(i, end);
      i = end;
      continue;
    }

    if (isIdentifierStart(ch)) {
      const tokenEnd = consumeIdentifier(source, i);
      const token = source.slice(i, tokenEnd);
      const previous = previousSignificantChar(source, i - 1);
      const next = nextSignificantChar(source, tokenEnd);

      if (previous !== ".") {
        const contextRef = matchContextReference(source, i);
        if (contextRef) {
          output += contextRef.replacement;
          i = contextRef.end;
          continue;
        }

        const envCall = matchEnvCall(source, i, tokenEnd);
        if (envCall) {
          output += envCall.replacement;
          i = envCall.end;
          continue;
        }
      }

      if (shouldPreserveIdentifier(previous, next)) {
        output += token;
        i = tokenEnd;
        continue;
      }

      const lower = token.toLowerCase();
      if (lower === "is") {
        const notMatch = matchFollowingNot(source, tokenEnd);
        if (notMatch) {
          output += "!==";
          i = notMatch;
          continue;
        }
        output += "===";
        i = tokenEnd;
        continue;
      }

      if (lower === "and") {
        output += "&&";
        i = tokenEnd;
        continue;
      }

      if (lower === "or") {
        output += "||";
        i = tokenEnd;
        continue;
      }

      if (lower === "not") {
        output += "!";
        i = tokenEnd;
        continue;
      }

      if (lower === "nil") {
        output += "null";
        i = tokenEnd;
        continue;
      }

      output += token;
      i = tokenEnd;
      continue;
    }

    output += ch;
    i += 1;
  }

  return output;
}

function emitStatements(statements: readonly IrStatement[], indent: string): string[] {
  const lines: string[] = [];

  for (const statement of statements) {
    if (statement.type === "reply") {
      lines.push(`${indent}await h.reply(${mapExpression(statement.expression)});`);
      continue;
    }

    if (statement.type === "log") {
      lines.push(`${indent}console.log(${mapExpression(statement.expression)});`);
      continue;
    }

    if (statement.type === "send") {
      lines.push(
        `${indent}await h.send(${mapExpression(statement.targetExpression)}, ${mapExpression(statement.messageExpression)});`,
      );
      continue;
    }

    if (statement.type === "let") {
      lines.push(`${indent}${statement.declarationKind} ${statement.name} = ${mapExpression(statement.expression)};`);
      continue;
    }

    if (statement.type === "return") {
      if (statement.expression?.trim()) {
        lines.push(`${indent}return ${mapExpression(statement.expression)};`);
      } else {
        lines.push(`${indent}return;`);
      }
      continue;
    }

    if (statement.type === "stop") {
      lines.push(`${indent}return;`);
      continue;
    }

    if (statement.type === "if") {
      lines.push(`${indent}if (${mapExpression(statement.condition)}) {`);
      lines.push(...emitStatements(statement.thenBody, `${indent}  `));

      if (statement.elseBody && statement.elseBody.length > 0) {
        lines.push(`${indent}} else {`);
        lines.push(...emitStatements(statement.elseBody, `${indent}  `));
      }

      lines.push(`${indent}}`);
      continue;
    }

    if (statement.type === "for") {
      lines.push(`${indent}for (const ${statement.iterator} of ${mapExpression(statement.iterableExpression)}) {`);
      lines.push(...emitStatements(statement.body, `${indent}  `));
      lines.push(`${indent}}`);
      continue;
    }

    if (statement.type === "while") {
      lines.push(`${indent}while (${mapExpression(statement.condition)}) {`);
      lines.push(...emitStatements(statement.body, `${indent}  `));
      lines.push(`${indent}}`);
      continue;
    }

    if (statement.type === "try") {
      lines.push(`${indent}try {`);
      lines.push(...emitStatements(statement.tryBody, `${indent}  `));
      lines.push(`${indent}} catch (${statement.catchVar}) {`);
      lines.push(...emitStatements(statement.catchBody, `${indent}  `));
      lines.push(`${indent}}`);
      continue;
    }

    if (statement.type === "break") {
      lines.push(`${indent}break;`);
      continue;
    }

    if (statement.type === "continue") {
      lines.push(`${indent}continue;`);
      continue;
    }

    if (statement.type === "insert") {
      const entries = Object.entries(statement.values)
        .map(([key, value]) => `${JSON.stringify(key)}: ${mapExpression(value)}`)
        .join(", ");
      lines.push(`${indent}__hapticDbInsert(${JSON.stringify(statement.table)}, { ${entries} });`);
      continue;
    }

    if (statement.type === "update") {
      const entries = Object.entries(statement.values)
        .map(([key, value]) => `${JSON.stringify(key)}: ${mapExpression(value)}`)
        .join(", ");
      lines.push(
        `${indent}await __hapticDbUpdate(${JSON.stringify(statement.table)}, ${JSON.stringify(statement.whereField)}, ${mapExpression(statement.whereExpression)}, { ${entries} });`,
      );
      continue;
    }

    if (statement.type === "select") {
      const selectCall = statement.whereField && statement.whereExpression
        ? `await __hapticDbSelect(${JSON.stringify(statement.table)}, ${JSON.stringify(statement.whereField)}, ${mapExpression(statement.whereExpression)})`
        : `await __hapticDbSelect(${JSON.stringify(statement.table)})`;

      if (statement.resultVariable && statement.declarationKind) {
        lines.push(`${indent}${statement.declarationKind} ${statement.resultVariable} = ${selectCall};`);
      } else {
        lines.push(`${indent}${selectCall};`);
      }
      continue;
    }

    if (statement.type === "delete") {
      lines.push(
        `${indent}await __hapticDbDelete(${JSON.stringify(statement.table)}, ${JSON.stringify(statement.whereField)}, ${mapExpression(statement.whereExpression)});`,
      );
      continue;
    }

    if (statement.type === "raw") {
      lines.push(`${indent}${statement.source}`);
    }
  }

  return lines;
}

function startsLineComment(source: string, index: number): boolean {
  return source[index] === "/" && source[index + 1] === "/";
}

function startsBlockComment(source: string, index: number): boolean {
  return source[index] === "/" && source[index + 1] === "*";
}

function isQuote(ch: string): ch is "'" | '"' | "`" {
  return ch === "'" || ch === '"' || ch === "`";
}

function consumeQuoted(source: string, start: number): number {
  const quote = source[start];
  let escaped = false;

  for (let i = start + 1; i < source.length; i += 1) {
    const ch = source[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === quote) {
      return i + 1;
    }
  }

  return source.length;
}

function consumeRegexLiteral(source: string, start: number): number {
  let escaped = false;
  let inCharClass = false;

  for (let i = start + 1; i < source.length; i += 1) {
    const ch = source[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === "[" && !inCharClass) {
      inCharClass = true;
      continue;
    }
    if (ch === "]" && inCharClass) {
      inCharClass = false;
      continue;
    }
    if (ch === "/" && !inCharClass) {
      let j = i + 1;
      while (j < source.length && /[a-z]/i.test(source[j])) {
        j += 1;
      }
      return j;
    }
  }

  return source.length;
}

function isRegexStart(source: string, index: number): boolean {
  const previous = previousSignificantChar(source, index - 1);
  if (previous === null) {
    return true;
  }
  return "([{:;,!?=+-*%&|^~<>".includes(previous);
}

function isIdentifierStart(ch: string): boolean {
  return /[A-Za-z_]/.test(ch);
}

function isIdentifierPart(ch: string): boolean {
  return /[A-Za-z0-9_]/.test(ch);
}

function consumeIdentifier(source: string, start: number): number {
  let end = start + 1;
  while (end < source.length && isIdentifierPart(source[end])) {
    end += 1;
  }
  return end;
}

function previousSignificantChar(source: string, start: number): string | null {
  for (let i = start; i >= 0; i -= 1) {
    const ch = source[i];
    if (!/\s/.test(ch)) {
      return ch;
    }
  }
  return null;
}

function nextSignificantChar(source: string, start: number): string | null {
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (!/\s/.test(ch)) {
      return ch;
    }
  }
  return null;
}

function shouldPreserveIdentifier(previous: string | null, next: string | null): boolean {
  return previous === "." || next === ":";
}

function matchFollowingNot(source: string, start: number): number | undefined {
  let i = start;
  while (i < source.length && /\s/.test(source[i])) {
    i += 1;
  }

  if (!source.slice(i).toLowerCase().startsWith("not")) {
    return undefined;
  }

  const end = i + 3;
  const before = source[i - 1];
  const after = source[end];
  if ((before && isIdentifierPart(before)) || (after && isIdentifierPart(after))) {
    return undefined;
  }

  return end;
}

function matchContextReference(
  source: string,
  start: number,
): { replacement: string; end: number } | undefined {
  const refs = [
    ["message.text", "h.message.text"],
    ["message.id", "h.message.id"],
    ["chat.id", "h.chat.id"],
    ["user.id", "h.user.id"],
    ["user.username", "h.user.username"],
  ] as const;

  for (const [raw, replacement] of refs) {
    if (!source.slice(start).startsWith(raw)) {
      continue;
    }
    const after = source[start + raw.length];
    if (after && (isIdentifierPart(after) || after === ".")) {
      continue;
    }
    return { replacement, end: start + raw.length };
  }

  return undefined;
}

function matchEnvCall(
  source: string,
  start: number,
  tokenEnd: number,
): { replacement: string; end: number } | undefined {
  if (source.slice(start, tokenEnd) !== "env") {
    return undefined;
  }

  let i = tokenEnd;
  while (i < source.length && /\s/.test(source[i])) {
    i += 1;
  }
  if (source[i] !== "(") {
    return undefined;
  }

  i += 1;
  while (i < source.length && /\s/.test(source[i])) {
    i += 1;
  }

  const quote = source[i];
  if (quote !== "'" && quote !== '"') {
    return undefined;
  }

  const nameStart = i + 1;
  const nameEnd = source.indexOf(quote, nameStart);
  if (nameEnd === -1) {
    return undefined;
  }

  const variableName = source.slice(nameStart, nameEnd);
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(variableName)) {
    return undefined;
  }

  i = nameEnd + 1;
  while (i < source.length && /\s/.test(source[i])) {
    i += 1;
  }
  if (source[i] !== ")") {
    return undefined;
  }

  return {
    replacement: `process.env.${variableName}`,
    end: i + 1,
  };
}
