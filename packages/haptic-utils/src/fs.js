export async function readTextFile(path) {
    const fs = await import("node:fs/promises");
    return fs.readFile(path, "utf8");
}
export async function writeTextFile(path, content) {
    const fs = await import("node:fs/promises");
    await fs.writeFile(path, content, "utf8");
}
export async function ensureDir(path) {
    const fs = await import("node:fs/promises");
    await fs.mkdir(path, { recursive: true });
}
//# sourceMappingURL=fs.js.map