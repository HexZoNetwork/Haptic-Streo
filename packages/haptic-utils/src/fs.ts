export async function readTextFile(path: string): Promise<string> {
  const fs = await import("node:fs/promises");
  const content = await fs.readFile(path, "utf8");
  return content.replace(/^\uFEFF/, "");
}

export async function writeTextFile(path: string, content: string): Promise<void> {
  const fs = await import("node:fs/promises");
  await fs.writeFile(path, content, "utf8");
}

export async function ensureDir(path: string): Promise<void> {
  const fs = await import("node:fs/promises");
  await fs.mkdir(path, { recursive: true });
}
