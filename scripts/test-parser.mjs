import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseDsl } from "../packages/haptic-parser/dist/index.js";
import { compileHapticFile, parseStage, semanticStage } from "../packages/haptic-core/dist/index.js";
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

const mixedTopLevelSource = `console.log("before")
command ping:
 reply "pong"
end
console.log("after")
`;

const mixedTopLevelGenerated = generateJavaScript(parseStage(mixedTopLevelSource), { engine: "telegraf" });
assert.ok(
  mixedTopLevelGenerated.indexOf('console.log("before")') < mixedTopLevelGenerated.indexOf('bot.command("ping"'),
  mixedTopLevelGenerated,
);
assert.ok(
  mixedTopLevelGenerated.indexOf('console.log("after")') > mixedTopLevelGenerated.indexOf('bot.command("ping"'),
  mixedTopLevelGenerated,
);

const selectProgram = parseStage(`command start:\n let rows = select * from users where id = 1\n reply rows.length\nend\n`);
const selectGenerated = generateJavaScript(selectProgram, { engine: "telegraf" });
assert.match(selectGenerated, /let rows = await __hapticDbSelect\("users", "id", 1\);/);
assert.match(selectGenerated, /await h\.reply\(rows\.length\);/);

const selectIntoProgram = parseStage(`command start:\n select * from users where id = user.id into rows\n reply rows.length\nend\n`);
const selectIntoGenerated = generateJavaScript(selectIntoProgram, { engine: "telegraf" });
assert.match(selectIntoGenerated, /let rows = await __hapticDbSelect\("users", "id", h\.user\.id\);/);

const updateDeleteProgram = parseStage(`command start:
 update users where id = user.id:
  name = "renamed"
  active = true
 end
 delete from sessions where user_id = user.id
end
`);
const updateDeleteGenerated = generateJavaScript(updateDeleteProgram, { engine: "telegraf" });
assert.match(updateDeleteGenerated, /await __hapticDbUpdate\("users", "id", h\.user\.id, \{ "name": "renamed", "active": true \}\);/);
assert.match(updateDeleteGenerated, /await __hapticDbDelete\("sessions", "user_id", h\.user\.id\);/);

const loopControlProgram = parseStage(`command start:
 let count = 0
 while count < 5:
  count = count + 1
  if count is 2:
   continue
  end
  if count > 3:
   break
  end
 end
 reply count
end
`);
const loopControlGenerated = generateJavaScript(loopControlProgram, { engine: "telegraf" });
assert.match(loopControlGenerated, /while \(count < 5\) \{/);
assert.match(loopControlGenerated, /continue;/);
assert.match(loopControlGenerated, /break;/);

assert.throws(
  () => parseStage(`command start:\n select * from users where id = 1\nend\n`),
  /HPT1016/,
);

assert.throws(
  () => parseStage(`command start:\n let rows = select * from users into found\nend\n`),
  /HPT1017/,
);

assert.throws(
  () => parseStage(`command start:\n delete from users\nend\n`),
  /HPT1018/,
);

assert.throws(
  () => parseStage(`command start:\n update users:\n  name = "x"\n end\nend\n`),
  /HPT1019/,
);

assert.throws(
  () => semanticStage(parseStage(`command start:\n break\nend\n`)),
  /break can only be used inside for\/while loops/i,
);

assert.throws(
  () => semanticStage(parseStage(`command start:\n continue\nend\n`)),
  /continue can only be used inside for\/while loops/i,
);

assert.throws(
  () => parseStage(`command start:\n reply\nend\n`),
  /HPT1009/,
);

assert.throws(
  () => parseStage(`command start\n reply "x"\nend\n`),
  /HPT1001/,
);

await testImportExportAndCjsBuild();

async function testImportExportAndCjsBuild() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "haptic-test-import-export-"));
  const entryFile = path.join(tempRoot, "bot.haptic");
  const sharedFile = path.join(tempRoot, "shared.haptic");

  await fs.writeFile(
    sharedFile,
    `export func greet(name):\n return "hi " + name\nend\n`,
  );
  await fs.writeFile(
    entryFile,
    [
      'import "./shared.haptic"',
      '',
      'bot "Demo":',
      ' token = env("BOT_TOKEN")',
      'end',
      '',
      'command start:',
      ' reply await greet(user.username)',
      'end',
      '',
    ].join("\n"),
  );

  const esmOutDir = path.join(tempRoot, "dist-esm");
  await compileHapticFile(entryFile, { engine: "telegraf", outDir: esmOutDir, moduleFormat: "esm" });
  const esmCode = await fs.readFile(path.join(esmOutDir, "bot.mjs"), "utf8");
  assert.match(esmCode, /export async function greet\(name\)/);
  assert.match(esmCode, /await h\.reply\(await greet\(h\.user\.username\)\);/);

  const cjsOutDir = path.join(tempRoot, "dist-cjs");
  await compileHapticFile(entryFile, { engine: "telegraf", outDir: cjsOutDir, moduleFormat: "cjs" });
  const cjsCode = await fs.readFile(path.join(cjsOutDir, "bot.cjs"), "utf8");
  assert.match(cjsCode, /const \{ Telegraf \} = require\("telegraf"\);/);
  assert.match(cjsCode, /exports\.greet = greet;/);
}
