export function emitReplyExpression(expression: string): string {
  return `await h.reply(${expression});`;
}
