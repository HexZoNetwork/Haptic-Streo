export function normalizeMatchExpression(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("/") && trimmed.lastIndexOf("/") > 0) {
    return trimmed;
  }

  return `new RegExp(${JSON.stringify(trimmed)})`;
}
