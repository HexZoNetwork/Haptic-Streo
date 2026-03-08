import { createProgramNode, type ProgramNode } from "@haptic/ast";
import { parseDsl } from "@haptic/parser";

export interface SourceSplit {
  dslSource: string;
  jsPreamble: string[];
}

export function splitMixedSource(source: string): SourceSplit {
  return {
    dslSource: source,
    jsPreamble: [],
  };
}

export function parseStage(source: string): ProgramNode {
  if (!source.trim()) {
    return createProgramNode([], []);
  }

  const parseResult = parseDsl(source);
  if (parseResult.lexErrors.length > 0 || parseResult.parseErrors.length > 0) {
    const lexErrors = parseResult.lexErrors.map((e) => `${e.code}: ${e.message}`);
    const parseErrors = parseResult.parseErrors.map((e) => `${e.code}: ${e.message}`);
    throw new Error(`Parse failed:\n${[...lexErrors, ...parseErrors].join("\n")}`);
  }

  return parseResult.ast;
}
