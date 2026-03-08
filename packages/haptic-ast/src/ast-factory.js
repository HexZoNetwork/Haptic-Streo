export function createProgramNode(body, jsPreamble = []) {
    return Object.freeze({
        kind: "Program",
        body,
        jsPreamble,
    });
}
export function createCommandNode(name, body) {
    return Object.freeze({
        kind: "Command",
        name,
        body,
    });
}
export function createReplyNode(message) {
    return Object.freeze({
        kind: "Reply",
        message,
    });
}
//# sourceMappingURL=ast-factory.js.map