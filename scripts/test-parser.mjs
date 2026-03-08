import assert from "node:assert/strict";
import { parseDsl } from "../packages/haptic-parser/dist/index.js";
import { parseStage } from "../packages/haptic-core/dist/index.js";
import { generateJavaScript } from "../packages/haptic-transpiler/dist/index.js";

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

const syntaxSource = `
fn greet(name):
 return "hi " + name
end

command start:
 if user.id is not nil and not false:
  reply await greet(user.username)
 elseif user.id is nil:
  reply "missing"
 else:
  reply "fallback"
 end
end
`;

const syntaxProgram = parseStage(syntaxSource);
const generated = generateJavaScript(syntaxProgram, { engine: "telegraf" });
assert.match(generated, /async function greet\(name\)/);
assert.match(generated, /h\.user\.id !== null && ! false/);
assert.match(generated, /if \(h\.user\.id === null\)/);
assert.match(generated, /await h\.reply\(await greet\(h\.user\.username\)\);/);

const rawJsProgram = parseStage(`command start:\n let items = [1, 2, 3]\n for (const item of items) {\n  console.log(item)\n }\nend\n`);
assert.equal(rawJsProgram.body.length, 1);

assert.throws(
  () => parseStage(`command start:\n reply\nend\n`),
  /HPT1009/,
);

assert.throws(
  () => parseStage(`command start\n reply "x"\nend\n`),
  /HPT1001/,
);
