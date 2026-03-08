import type { BaseNode } from "./BaseNode.js";
export interface RawJsNode extends BaseNode {
    readonly kind: "RawJS";
    readonly source: string;
}
//# sourceMappingURL=RawJsNode.d.ts.map