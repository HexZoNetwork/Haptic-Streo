import type { CommandNode } from "./nodes/CommandNode.js";
import type { ProgramNode } from "./nodes/ProgramNode.js";
import type { ReplyNode } from "./nodes/ReplyNode.js";
import type { StatementNode } from "./nodes/StatementNode.js";
export declare function createProgramNode(body: readonly StatementNode[], jsPreamble?: readonly string[]): ProgramNode;
export declare function createCommandNode(name: string, body: readonly StatementNode[]): CommandNode;
export declare function createReplyNode(message: string): ReplyNode;
//# sourceMappingURL=ast-factory.d.ts.map