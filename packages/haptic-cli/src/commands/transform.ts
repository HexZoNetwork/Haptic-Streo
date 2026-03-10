import fs from "node:fs";
import path from "node:path";
import type { Command } from "commander";
import { ensureDir, readTextFile, writeTextFile } from "@haptic/utils";
import { HapticCliError } from "../errors.js";
import type { CliProjectConfig } from "./shared.js";
import { loadProjectConfig } from "./shared.js";
import { normalizeEngine, syncProjectPackageJson } from "./scaffold-shared.js";

const JS_EXTENSIONS = new Set([".js", ".mjs", ".cjs"]);
const SKIPPED_DIRS = new Set(["node_modules"]);

export function registerTransformCommand(program: Command): void {
  program
    .command("transform")
    .description("Transform JavaScript source into Haptic code")
    .argument("[input]", "JavaScript file or directory", ".")
    .option("-o, --out <path>", "Output file or root directory for generated .haptic files")
    .option("--no-sync-package", "Do not sync package.json from config.hpconf")
    .action(async (input: string, opts: { out?: string; syncPackage?: boolean }) => {
      const resolvedInput = path.resolve(process.cwd(), input);
      if (!fs.existsSync(resolvedInput)) {
        throw new HapticCliError({
          code: "HPTCLI_TRANSFORM_INPUT_NOT_FOUND",
          message: `Transform input not found: ${resolvedInput}`,
        });
      }

      const stat = fs.statSync(resolvedInput);
      if (stat.isDirectory()) {
        const written = await transformDirectory(resolvedInput, opts.out ? path.resolve(process.cwd(), opts.out) : undefined);
        const syncResult = opts.syncPackage !== false ? await syncProjectFiles(resolvedInput) : undefined;

        process.stdout.write(`Transformed ${written.length} file(s)\n`);
        for (const file of written) {
          process.stdout.write(`  - ${file}\n`);
        }
        if (syncResult?.configPath) {
          process.stdout.write(`Config synced: ${syncResult.configPath}\n`);
        }
        if (syncResult?.packagePath) {
          process.stdout.write(`Package synced: ${syncResult.packagePath}\n`);
        }
        return;
      }

      const targetOut = opts.out
        ? path.resolve(process.cwd(), opts.out)
        : path.join(path.dirname(resolvedInput), `${path.basename(resolvedInput, path.extname(resolvedInput))}.haptic`);
      const writtenFile = await transformSingleFile(resolvedInput, targetOut);
      const syncResult = opts.syncPackage !== false ? await syncProjectFiles(path.dirname(resolvedInput)) : undefined;

      process.stdout.write(`Transformed: ${writtenFile}\n`);
      if (syncResult?.configPath) {
        process.stdout.write(`Config synced: ${syncResult.configPath}\n`);
      }
      if (syncResult?.packagePath) {
        process.stdout.write(`Package synced: ${syncResult.packagePath}\n`);
      }
    });
}

async function transformDirectory(inputDir: string, outDir?: string): Promise<string[]> {
  const files = await collectJavaScriptFiles(inputDir);
  const written: string[] = [];

  for (const file of files) {
    const relative = path.relative(inputDir, file);
    const target = outDir
      ? path.join(outDir, replaceExtension(relative, ".haptic"))
      : path.join(path.dirname(file), `${path.basename(file, path.extname(file))}.haptic`);
    written.push(await transformSingleFile(file, target));
  }

  return written;
}

async function transformSingleFile(inputFile: string, outputFile: string): Promise<string> {
  const source = await readTextFile(inputFile);
  const haptic = transformJavaScriptToHaptic(source, {
    fallbackName: path.basename(inputFile, path.extname(inputFile)),
  });

  await ensureDir(path.dirname(outputFile));
  await writeTextFile(outputFile, ensureTrailingNewline(haptic));
  return outputFile;
}

async function collectJavaScriptFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  const queue = [root];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const entries = await fs.promises.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (shouldSkipEntry(entry.name)) {
        continue;
      }

      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(absolute);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (JS_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        out.push(absolute);
      }
    }
  }

  return out.sort();
}

function shouldSkipEntry(name: string): boolean {
  if (name.startsWith(".")) {
    return true;
  }
  return SKIPPED_DIRS.has(name);
}

function replaceExtension(relativePath: string, nextExtension: string): string {
  const parsed = path.parse(relativePath);
  return path.join(parsed.dir, `${parsed.name}${nextExtension}`);
}

interface TransformOptions {
  readonly fallbackName: string;
}

function transformJavaScriptToHaptic(source: string, options: TransformOptions): string {
  const normalized = source.replace(/\r\n/g, "\n");
  const sections = extractTelegrafSections(normalized);
  const lines: string[] = [];

  const botConfig = detectBotConfig(normalized, options.fallbackName);
  if (botConfig) {
    lines.push(`${botConfig.kind} "${botConfig.name}":`);
    lines.push(` ${botConfig.configKey} = ${reverseMapExpression(botConfig.value)}`);
    lines.push("end");
    lines.push("");
  }

  const preamble = buildPreamble(normalized, sections);
  if (preamble.length > 0) {
    lines.push(...preamble);
    if (lines[lines.length - 1] !== "") {
      lines.push("");
    }
  }

  for (const section of sections) {
    if (section.type === "command") {
      lines.push(`command ${section.name}:`);
      lines.push(...convertJavaScriptBlockToDsl(section.body, 1));
      lines.push("end");
      lines.push("");
      continue;
    }

    const match = extractMessageMatch(section.body);
    if (match) {
      lines.push(`on message match ${match.match}:`);
      lines.push(...convertJavaScriptBlockToDsl(match.body, 1));
      lines.push("end");
      lines.push("");
      continue;
    }

    lines.push(`on ${section.name}:`);
    lines.push(...convertJavaScriptBlockToDsl(section.body, 1));
    lines.push("end");
    lines.push("");
  }

  if (lines.length === 0) {
    return normalizeRawJavaScript(normalized);
  }

  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines.join("\n");
}

interface ExtractedSection {
  readonly type: "command" | "event";
  readonly name: string;
  readonly body: string;
  readonly start: number;
  readonly end: number;
}

function extractTelegrafSections(source: string): ExtractedSection[] {
  const sections: ExtractedSection[] = [];
  const patterns = [
    { type: "command" as const, regex: /bot\.command\(\s*["']([^"']+)["']\s*,\s*(?:async\s*)?\(([^)]*)\)\s*=>\s*\{/g },
    { type: "event" as const, regex: /bot\.on\(\s*["']([^"']+)["']\s*,\s*(?:async\s*)?\(([^)]*)\)\s*=>\s*\{/g },
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.regex.exec(source)) !== null) {
      const openBrace = source.indexOf("{", match.index);
      const closeBrace = findMatchingBrace(source, openBrace);
      if (closeBrace === -1) {
        continue;
      }

      let end = closeBrace + 1;
      while (end < source.length && /\s/.test(source[end])) {
        end += 1;
      }
      if (source.slice(end, end + 2) === ");") {
        end += 2;
      }

      sections.push({
        type: pattern.type,
        name: match[1],
        body: source.slice(openBrace + 1, closeBrace).trim(),
        start: match.index,
        end,
      });
    }
  }

  return sections.sort((a, b) => a.start - b.start);
}

function findMatchingBrace(source: string, openIndex: number): number {
  let depth = 0;
  let inQuote: "'" | '"' | "`" | null = null;
  let escaped = false;
  let inBlockComment = false;
  let inLineComment = false;

  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inQuote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === inQuote) {
        inQuote = null;
      }
      continue;
    }

    if (ch === "/" && next === "/") {
      inLineComment = true;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      inQuote = ch;
      continue;
    }
    if (ch === "{") {
      depth += 1;
      continue;
    }
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}

function detectBotConfig(
  source: string,
  fallbackName: string,
): { kind: "bot" | "userbot"; name: string; configKey: string; value: string } | undefined {
  const telegraf = source.match(/new\s+Telegraf\(([^)]+)\)/);
  if (telegraf) {
    return {
      kind: "bot",
      name: fallbackName,
      configKey: "token",
      value: telegraf[1].trim(),
    };
  }

  const gramjsId = source.match(/const\s+apiId\s*=\s*Number\(([^)]+)\)/);
  const gramjsHash = source.match(/const\s+apiHash\s*=\s*String\(([^)]+)\)/);
  if (gramjsId && gramjsHash) {
    return {
      kind: "userbot",
      name: fallbackName,
      configKey: "api_id",
      value: gramjsId[1].trim(),
    };
  }

  return undefined;
}

function buildPreamble(source: string, sections: readonly ExtractedSection[]): string[] {
  const fragments: string[] = [];
  let cursor = 0;
  for (const section of sections) {
    fragments.push(source.slice(cursor, section.start));
    cursor = section.end;
  }
  fragments.push(source.slice(cursor));

  const raw = fragments.join("\n");
  return raw
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return false;
      }
      if (/^import\s+\{\s*Telegraf\s*\}/.test(trimmed)) {
        return false;
      }
      if (/^const\s+bot\s*=\s*new\s+Telegraf\(/.test(trimmed)) {
        return false;
      }
      if (/^bot\.launch\(\);?$/.test(trimmed)) {
        return false;
      }
      if (/^function\s+createHapticContext\(/.test(trimmed)) {
        return false;
      }
      if (/^const\s+h\s*=\s*createHapticContext\(/.test(trimmed)) {
        return false;
      }
      return true;
    });
}

function extractMessageMatch(body: string): { match: string; body: string } | undefined {
  const lines = body.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) {
    return undefined;
  }

  const first = lines[0];
  const generated = first.match(/^if\s+\(!\((.+)\)\)\s+return;$/);
  if (!generated) {
    return undefined;
  }

  const match = reverseGeneratedMatch(generated[1]);
  if (!match) {
    return undefined;
  }

  return {
    match,
    body: lines.slice(1).join("\n"),
  };
}

function reverseGeneratedMatch(input: string): string | undefined {
  const regexCall = input.match(/^(.+)\.test\((?:h|ctx)\.message\??\.\s*text(?:\s*\?\?\s*""\s*)?\)$/);
  if (!regexCall) {
    return undefined;
  }

  const candidate = regexCall[1].trim();
  const inlineRegex = candidate.match(/^new\s+RegExp\((.+)\)$/);
  if (inlineRegex) {
    return inlineRegex[1];
  }
  return candidate;
}

function convertJavaScriptBlockToDsl(body: string, baseIndent: number): string[] {
  const out: string[] = [];
  const stack: Array<"dsl" | "raw"> = [];
  let indent = baseIndent;

  for (const rawLine of body.split("\n")) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      continue;
    }
    if (trimmed === "const h = createHapticContext(ctx);" || trimmed === "const h = createHapticContext(event, client);") {
      continue;
    }

    const elseIfMatch = trimmed.match(/^}\s*else\s+if\s*\((.+)\)\s*\{$/);
    if (elseIfMatch && stack[stack.length - 1] === "dsl") {
      indent -= 1;
      stack.pop();
      out.push(`${" ".repeat(indent)}else if ${reverseMapExpression(elseIfMatch[1])}:`);
      stack.push("dsl");
      indent += 1;
      continue;
    }

    if (/^}\s*else\s*\{$/.test(trimmed) && stack[stack.length - 1] === "dsl") {
      indent -= 1;
      stack.pop();
      out.push(`${" ".repeat(indent)}else:`);
      stack.push("dsl");
      indent += 1;
      continue;
    }

    const catchMatch = trimmed.match(/^}\s*catch\s*\(([^)]+)\)\s*\{$/);
    if (catchMatch && stack[stack.length - 1] === "dsl") {
      indent -= 1;
      stack.pop();
      out.push(`${" ".repeat(indent)}catch ${catchMatch[1].trim()}:`);
      stack.push("dsl");
      indent += 1;
      continue;
    }

    if (trimmed === "}") {
      const kind = stack.pop() ?? "raw";
      indent -= 1;
      out.push(`${" ".repeat(indent)}${kind === "dsl" ? "end" : "}"}`);
      continue;
    }

    const ifMatch = trimmed.match(/^if\s*\((.+)\)\s*\{$/);
    if (ifMatch) {
      out.push(`${" ".repeat(indent)}if ${reverseMapExpression(ifMatch[1])}:`);
      stack.push("dsl");
      indent += 1;
      continue;
    }

    const forMatch = trimmed.match(/^for\s*\(\s*(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s+of\s+(.+)\)\s*\{$/);
    if (forMatch) {
      out.push(`${" ".repeat(indent)}for ${forMatch[1]} in ${reverseMapExpression(forMatch[2])}:`);
      stack.push("dsl");
      indent += 1;
      continue;
    }

    if (/^try\s*\{$/.test(trimmed)) {
      out.push(`${" ".repeat(indent)}try:`);
      stack.push("dsl");
      indent += 1;
      continue;
    }

    if (trimmed.endsWith("{")) {
      out.push(`${" ".repeat(indent)}${trimmed}`);
      stack.push("raw");
      indent += 1;
      continue;
    }

    const replyMatch = trimmed.match(/^await\s+(?:h|ctx)\.reply\((.+)\);?$/);
    if (replyMatch) {
      out.push(`${" ".repeat(indent)}reply ${reverseMapExpression(replyMatch[1])}`);
      continue;
    }

    const sendMatch = trimmed.match(/^await\s+(?:h\.send|ctx\.telegram\.sendMessage)\((.+?),\s*(.+)\);?$/);
    if (sendMatch) {
      out.push(`${" ".repeat(indent)}send ${reverseMapExpression(sendMatch[1])} ${reverseMapExpression(sendMatch[2])}`);
      continue;
    }

    const logMatch = trimmed.match(/^console\.log\((.+)\);?$/);
    if (logMatch) {
      out.push(`${" ".repeat(indent)}log ${reverseMapExpression(logMatch[1])}`);
      continue;
    }

    const declarationMatch = trimmed.match(/^(let|const|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+);$/);
    if (declarationMatch) {
      out.push(
        `${" ".repeat(indent)}${declarationMatch[1]} ${declarationMatch[2]} = ${reverseMapExpression(declarationMatch[3])}`,
      );
      continue;
    }

    const returnValueMatch = trimmed.match(/^return\s+(.+);$/);
    if (returnValueMatch) {
      out.push(`${" ".repeat(indent)}return ${reverseMapExpression(returnValueMatch[1])}`);
      continue;
    }

    if (trimmed === "return;" || trimmed === "return") {
      out.push(`${" ".repeat(indent)}stop`);
      continue;
    }

    out.push(`${" ".repeat(indent)}${trimmed}`);
  }

  while (stack.length > 0) {
    const kind = stack.pop();
    indent -= 1;
    out.push(`${" ".repeat(indent)}${kind === "dsl" ? "end" : "}"}`);
  }

  return out;
}

function reverseMapExpression(expression: string): string {
  let output = expression.trim();

  output = output.replace(/\bprocess\.env\.([A-Za-z_][A-Za-z0-9_]*)\b/g, 'env("$1")');
  output = output.replace(/\bh\.message\.text\b/g, "message.text");
  output = output.replace(/\bctx\.message\?\.\s*text\s*\?\?\s*""\b/g, "message.text");
  output = output.replace(/\bctx\.message\?\.\s*text\b/g, "message.text");
  output = output.replace(/\bh\.message\.id\b/g, "message.id");
  output = output.replace(/\bh\.chat\.id\b/g, "chat.id");
  output = output.replace(/\bctx\.chat\?\.\s*id\b/g, "chat.id");
  output = output.replace(/\bh\.user\.id\b/g, "user.id");
  output = output.replace(/\bctx\.from\?\.\s*id\b/g, "user.id");
  output = output.replace(/\bh\.user\.username\b/g, "user.username");
  output = output.replace(/\bctx\.from\?\.\s*username\b/g, "user.username");
  output = output.replace(/!==\s*null\b/g, "is not nil");
  output = output.replace(/===\s*null\b/g, "is nil");
  output = output.replace(/!==/g, "is not");
  output = output.replace(/===/g, "is");
  output = output.replace(/\&\&/g, "and");
  output = output.replace(/\|\|/g, "or");
  output = output.replace(/!\s*(?=[A-Za-z_(])/g, "not ");

  return output;
}

function normalizeRawJavaScript(source: string): string {
  return source
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function ensureTrailingNewline(source: string): string {
  return source.endsWith("\n") ? source : `${source}\n`;
}

interface SyncResult {
  readonly configPath?: string;
  readonly packagePath?: string;
}

async function syncProjectFiles(projectRoot: string): Promise<SyncResult | undefined> {
  const loaded = await loadProjectConfig(undefined, projectRoot);
  const config = loaded.config;
  let configPath = loaded.configPath;
  let packagePath: string | undefined;
  let nextConfig: CliProjectConfig = { ...config };

  if (typeof nextConfig.entry === "string" && JS_EXTENSIONS.has(path.extname(nextConfig.entry).toLowerCase())) {
    nextConfig = {
      ...nextConfig,
      entry: replaceExtension(nextConfig.entry, ".haptic"),
    };
  }

  if (loaded.configPath && JSON.stringify(nextConfig) !== JSON.stringify(config)) {
    configPath = await writeConfigFile(loaded.configPath, nextConfig);
  }

  if (typeof nextConfig.engine === "string") {
    packagePath = syncProjectPackageJson(projectRoot, normalizeEngine(nextConfig.engine), undefined, {
      moduleFormat: nextConfig.moduleFormat,
      packageConfig: nextConfig.package,
    });
  }

  if (!configPath && !packagePath) {
    return undefined;
  }

  return { configPath, packagePath };
}

async function writeConfigFile(configPath: string, config: CliProjectConfig): Promise<string> {
  await writeTextFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
  return configPath;
}
