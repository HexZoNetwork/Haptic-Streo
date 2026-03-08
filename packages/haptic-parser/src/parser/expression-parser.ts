export interface ParseExpressionOptions {
  readonly allowEmpty?: boolean;
}

export function parseExpression(source: string, options: ParseExpressionOptions = {}): string {
  const expression = source.trim();

  if (!expression) {
    if (options.allowEmpty) {
      return "";
    }
    throw new Error("Expected expression");
  }

  validateExpressionSyntax(expression);
  return expression;
}

function validateExpressionSyntax(expression: string): void {
  const translated = translateDslOperators(expression);

  try {
    // Parse inside an async function so `await ...` remains legal in DSL expressions.
    new Function(`return (async () => (${translated}))();`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid expression syntax: ${message}`);
  }
}

function translateDslOperators(source: string): string {
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
