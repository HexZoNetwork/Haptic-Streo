import type { BaseNode } from "./BaseNode.js";

export interface LetNode extends BaseNode {
  readonly kind: "Let";
  readonly declarationKind: "let" | "const" | "var";
  readonly name: string;
  readonly expression: string;
}
