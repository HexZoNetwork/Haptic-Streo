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
    const lexErrors = parseResult.lexErrors.map((e) => formatDiagnostic(e.code, e.message, e.line));
    const parseErrors = parseResult.parseErrors.map((e) => formatDiagnostic(e.code, e.message, e.line));
    throw new Error(`Parse failed:\n${[...lexErrors, ...parseErrors].join("\n")}`);
  }

  return parseResult.ast;
}

function formatDiagnostic(code: string, message: string, line?: number): string {
  return line ? `${code} (line ${line}): ${message}` : `${code}: ${message}`;
}
