import type { ProgramNode } from "@haptic/ast";

export function semanticStage(ast: ProgramNode): ProgramNode {
  const seenCommands = new Set<string>();
  const seenFunctions = new Set<string>();
  const seenTables = new Set<string>();
  let botDeclarations = 0;

  for (const node of ast.body) {
    if (node.kind === "Bot") {
      botDeclarations += 1;
      continue;
    }

    if (node.kind !== "Command") {
      if (node.kind === "Function") {
        if (seenFunctions.has(node.name)) {
          throw new Error(`Duplicate function name: ${node.name}`);
        }
        seenFunctions.add(node.name);
      }

      if (node.kind === "Db") {
        if (seenTables.has(node.name)) {
          throw new Error(`Duplicate db table name: ${node.name}`);
        }
        seenTables.add(node.name);
      }

      continue;
    }

    if (seenCommands.has(node.name)) {
      throw new Error(`Duplicate command name: ${node.name}`);
    }

    seenCommands.add(node.name);
  }

  if (botDeclarations > 1) {
    throw new Error("Only one bot/userbot declaration is allowed.");
  }

  return ast;
}
