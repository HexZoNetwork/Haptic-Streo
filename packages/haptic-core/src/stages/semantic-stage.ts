import type { ProgramNode, StatementNode } from "@haptic/ast";
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

    if (node.kind === "Function") {
      if (seenFunctions.has(node.name)) {
        throw new HapticCompilerError({
          code: "HPTC_SEMANTIC_DUPLICATE_FUNCTION",
          message: `Duplicate function name: ${node.name}`,
          stage: "semantic",
        });
      }
      seenFunctions.add(node.name);

      const seenParams = new Set<string>();
      for (const param of node.params) {
        if (seenParams.has(param)) {
          throw new HapticCompilerError({
            code: "HPTC_SEMANTIC_DUPLICATE_PARAM",
            message: `Duplicate parameter name in function ${node.name}: ${param}`,
            stage: "semantic",
          });
        }
        seenParams.add(param);
      }

      validateLoopControl(node.body);
      continue;
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

      const seenFields = new Set<string>();
      for (const field of node.fields) {
        if (seenFields.has(field.name)) {
          throw new HapticCompilerError({
            code: "HPTC_SEMANTIC_DUPLICATE_DB_FIELD",
            message: `Duplicate db field in table ${node.name}: ${field.name}`,
            stage: "semantic",
          });
        }
        seenFields.add(field.name);
      }
      continue;
    }

    if (node.kind === "Command") {
      if (seenCommands.has(node.name)) {
        throw new HapticCompilerError({
          code: "HPTC_SEMANTIC_DUPLICATE_COMMAND",
          message: `Duplicate command name: ${node.name}`,
          stage: "semantic",
        });
      }

      seenCommands.add(node.name);
      validateLoopControl(node.body);
      continue;
    }

    if (node.kind === "Event") {
      validateLoopControl(node.body);
    }
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

function validateLoopControl(statements: readonly StatementNode[], inLoop = false): void {
  for (const statement of statements) {
    if (statement.kind === "Break" || statement.kind === "Continue") {
      if (!inLoop) {
        throw new HapticCompilerError({
          code: "HPTC_SEMANTIC_LOOP_CONTROL_INVALID",
          message: `${statement.kind.toLowerCase()} can only be used inside for/while loops.`,
          stage: "semantic",
        });
      }
      continue;
    }

    if (statement.kind === "Condition") {
      validateLoopControl(statement.body, inLoop);
      if (statement.elseBody) {
        validateLoopControl(statement.elseBody, inLoop);
      }
      continue;
    }

    if (statement.kind === "Loop" || statement.kind === "While") {
      validateLoopControl(statement.body, true);
      continue;
    }

    if (statement.kind === "TryCatch") {
      validateLoopControl(statement.tryBody, inLoop);
      validateLoopControl(statement.catchBody, inLoop);
      continue;
    }
  }
}
