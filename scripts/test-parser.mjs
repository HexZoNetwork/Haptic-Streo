import assert from "node:assert/strict";
import { parseDsl } from "../packages/haptic-parser/dist/index.js";
import { parseStage } from "../packages/haptic-core/dist/index.js";

const source = `command start:
 // { this comment should not break brace counting
 reply "ok"
 /* }
    still comment */
end
`;

const parsed = parseDsl(source);
assert.equal(parsed.parseErrors.length, 0, JSON.stringify(parsed.parseErrors, null, 2));
assert.equal(parsed.ast.body.length, 1);

const program = parseStage(source);
assert.equal(program.body.length, 1);

assert.throws(
  () => parseStage(`bot "Demo":\n nope\nend\n`),
  /line 2/,
);
