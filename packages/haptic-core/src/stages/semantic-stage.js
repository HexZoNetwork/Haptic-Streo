export function semanticStage(ast) {
    const seen = new Set();
    for (const node of ast.body) {
        if (node.kind !== "Command") {
            continue;
        }
        if (seen.has(node.name)) {
            throw new Error(`Duplicate command name: ${node.name}`);
        }
        seen.add(node.name);
    }
    return ast;
}
//# sourceMappingURL=semantic-stage.js.map