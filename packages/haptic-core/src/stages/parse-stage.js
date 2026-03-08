import { createProgramNode } from "@haptic/ast";
import { parseDsl } from "@haptic/parser";
export function splitMixedSource(source) {
    const lines = source.split(/\r?\n/);
    const dslBlocks = [];
    const jsPreamble = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (/^\s*command\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\{\s*$/.test(line)) {
            const blockLines = [line];
            let depth = braceDelta(line);
            i += 1;
            while (i < lines.length && depth > 0) {
                const nextLine = lines[i];
                blockLines.push(nextLine);
                depth += braceDelta(nextLine);
                i += 1;
            }
            if (depth !== 0) {
                throw new Error("Unbalanced braces in command block.");
            }
            dslBlocks.push(blockLines.join("\n"));
            continue;
        }
        jsPreamble.push(line);
        i += 1;
    }
    return {
        dslSource: dslBlocks.join("\n\n"),
        jsPreamble,
    };
}
export function parseStage(source) {
    const split = splitMixedSource(source);
    if (!split.dslSource.trim()) {
        return createProgramNode([], split.jsPreamble);
    }
    const parseResult = parseDsl(split.dslSource);
    if (parseResult.lexErrors.length > 0 || parseResult.parseErrors.length > 0) {
        const lexErrors = parseResult.lexErrors.map((e) => e.message);
        const parseErrors = parseResult.parseErrors.map((e) => e.message);
        throw new Error(`Parse failed:\n${[...lexErrors, ...parseErrors].join("\n")}`);
    }
    return createProgramNode(parseResult.ast.body, split.jsPreamble);
}
function braceDelta(line) {
    const opens = (line.match(/\{/g) ?? []).length;
    const closes = (line.match(/\}/g) ?? []).length;
    return opens - closes;
}
//# sourceMappingURL=parse-stage.js.map