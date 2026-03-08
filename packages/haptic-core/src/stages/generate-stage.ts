import type { ProgramNode } from "@haptic/ast";
import { generateJavaScript } from "@haptic/transpiler";

export function generateStage(ast: ProgramNode, engine: "telegraf" | "gramjs"): string {
  return generateJavaScript(ast, { engine });
}
