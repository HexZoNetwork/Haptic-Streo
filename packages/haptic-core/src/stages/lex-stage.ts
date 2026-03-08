import { tokenize } from "@haptic/parser";

export function lexStage(source: string) {
  return tokenize(source);
}
