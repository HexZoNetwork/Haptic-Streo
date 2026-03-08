export interface ParsedAiBlock {
  source: string;
}

export function parseAiBlock(source: string): ParsedAiBlock {
  return { source: source.trim() };
}
