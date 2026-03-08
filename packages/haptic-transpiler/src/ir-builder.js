export function buildIr(program) {
    const commands = [];
    for (const node of program.body) {
        if (node.kind !== "Command") {
            continue;
        }
        const replies = [];
        for (const statement of node.body) {
            if (statement.kind === "Reply") {
                replies.push({
                    type: "reply",
                    message: statement.message,
                });
            }
        }
        commands.push({
            type: "command",
            name: node.name,
            body: replies,
        });
    }
    return {
        commands,
        jsPreamble: program.jsPreamble,
    };
}
//# sourceMappingURL=ir-builder.js.map