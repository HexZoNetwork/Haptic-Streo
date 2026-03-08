import path from "node:path";
import { ensureDir, writeTextFile } from "@haptic/utils";
export function registerNewCommand(program) {
    program
        .command("new")
        .description("Scaffold a new Haptic project")
        .argument("[type]", "Project type: bot | userbot", "bot")
        .argument("[name]", "Project folder name", "my-haptic-project")
        .action(async (type, name) => {
        const root = path.resolve(process.cwd(), name);
        await ensureDir(root);
        const source = 'command start {\n reply "hello"\n}\n';
        const engine = type === "userbot" ? "gramjs" : "telegraf";
        await writeTextFile(path.join(root, "bot.haptic"), source);
        await writeTextFile(path.join(root, "haptic.config.js"), `export default {\n  engine: \"${engine}\",\n  outDir: \"dist\",\n  plugins: []\n};\n`);
        await writeTextFile(path.join(root, "package.json"), '{\n  "name": "my-haptic-project",\n  "private": true,\n  "type": "module"\n}\n');
        process.stdout.write(`Created: ${root}\n`);
    });
}
//# sourceMappingURL=new.js.map