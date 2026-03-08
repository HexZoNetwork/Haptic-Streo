import type { ProgramNode } from "@haptic/ast";

export type CompilerHookName =
  | "beforeParse"
  | "afterParse"
  | "beforeTransform"
  | "afterTransform"
  | "beforeGenerate"
  | "afterGenerate";

export interface CompilerHookContext {
  source?: string;
  ast?: ProgramNode;
  output?: string;
}

export interface HapticPlugin {
  name: string;
  hooks?: Partial<Record<CompilerHookName, (ctx: CompilerHookContext) => void | Promise<void>>>;
}
