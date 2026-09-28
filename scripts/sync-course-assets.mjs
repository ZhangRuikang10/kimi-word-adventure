import { cp, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = process.env.KIMI_COURSE_ASSET_ROOT;
if (!sourceRoot) throw new Error("Set KIMI_COURSE_ASSET_ROOT to the approved course project's assets directory.");
const allowlist = JSON.parse(await readFile(path.join(projectRoot, "config", "course-assets.allowlist.json"), "utf8"));
for (const relativePath of allowlist.assets) {
  const source = path.resolve(sourceRoot, relativePath); const sourceRelative = path.relative(path.resolve(sourceRoot), source);
  if (sourceRelative.startsWith("..") || path.isAbsolute(sourceRelative)) throw new Error(`Unsafe source path: ${relativePath}`);
  await stat(source); const destination = path.join(projectRoot, "public", "assets", "course", relativePath);
  await mkdir(path.dirname(destination), { recursive: true }); await cp(source, destination, { force: true });
}
console.log(`Copied ${allowlist.assets.length} allow-listed course assets into public/assets/course.`);
