import type { IrStatement } from "../ir-builder.js";

export function emitTelegrafStatements(statements: readonly IrStatement[], indent = ""): string[] {
  return emitStatements(statements, indent);
}

export function emitGramJsStatements(statements: readonly IrStatement[], indent = ""): string[] {
  return emitStatements(statements, indent);
}

export function mapExpression(expression: string): string {
  let output = expression.trim();

  output = output.replace(/env\(\s*"([A-Za-z_][A-Za-z0-9_]*)"\s*\)/g, "process.env.$1");
  output = output.replace(/\bmessage\.text\b/g, "h.message.text");
  output = output.replace(/\bmessage\.id\b/g, "h.message.id");
  output = output.replace(/\bchat\.id\b/g, "h.chat.id");
  output = output.replace(/\buser\.id\b/g, "h.user.id");
  output = output.replace(/\buser\.username\b/g, "h.user.username");

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

    if (statement.type === "try") {
      lines.push(`${indent}try {`);
      lines.push(...emitStatements(statement.tryBody, `${indent}  `));
      lines.push(`${indent}} catch (${statement.catchVar}) {`);
      lines.push(...emitStatements(statement.catchBody, `${indent}  `));
      lines.push(`${indent}}`);
      continue;
    }

    if (statement.type === "insert") {
      const entries = Object.entries(statement.values)
        .map(([key, value]) => `${JSON.stringify(key)}: ${mapExpression(value)}`)
        .join(", ");
      lines.push(`${indent}__hapticDbInsert(${JSON.stringify(statement.table)}, { ${entries} });`);
      continue;
    }

    if (statement.type === "select") {
      if (statement.whereField && statement.whereExpression) {
        lines.push(
          `${indent}await __hapticDbSelect(${JSON.stringify(statement.table)}, ${JSON.stringify(statement.whereField)}, ${mapExpression(statement.whereExpression)});`,
        );
      } else {
        lines.push(`${indent}await __hapticDbSelect(${JSON.stringify(statement.table)});`);
      }
      continue;
    }

    if (statement.type === "raw") {
      lines.push(`${indent}${statement.source}`);
    }
  }

  return lines;
}
