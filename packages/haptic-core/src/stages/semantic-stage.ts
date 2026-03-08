import type { ProgramNode } from "@haptic/ast";
import { HapticCompilerError } from "../errors.js";

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
          throw new HapticCompilerError({
            code: "HPTC_SEMANTIC_DUPLICATE_FUNCTION",
            message: `Duplicate function name: ${node.name}`,
            stage: "semantic",
          });
        }
        seenFunctions.add(node.name);
      }

      if (node.kind === "Db") {
        if (seenTables.has(node.name)) {
          throw new HapticCompilerError({
            code: "HPTC_SEMANTIC_DUPLICATE_DB",
            message: `Duplicate db table name: ${node.name}`,
            stage: "semantic",
          });
        }
        seenTables.add(node.name);
      }

      continue;
    }

    if (seenCommands.has(node.name)) {
      throw new HapticCompilerError({
        code: "HPTC_SEMANTIC_DUPLICATE_COMMAND",
        message: `Duplicate command name: ${node.name}`,
        stage: "semantic",
      });
    }

    seenCommands.add(node.name);
  }

  if (botDeclarations > 1) {
    throw new HapticCompilerError({
      code: "HPTC_SEMANTIC_DUPLICATE_BOT",
      message: "Only one bot/userbot declaration is allowed.",
      stage: "semantic",
    });
  }

  return ast;
}
