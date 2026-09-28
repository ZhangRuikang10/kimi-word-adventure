import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const env = { ...process.env, LOCAL_ACCEPTANCE: "true", VITE_LOCAL_ACCEPTANCE: "true" };
execFileSync(process.execPath, [resolve("node_modules", "typescript", "bin", "tsc"), "-b"], { stdio: "inherit", env });
execFileSync(process.execPath, [resolve("node_modules", "vite", "bin", "vite.js"), "build"], { stdio: "inherit", env });

const index = resolve("play-now", "index.html");
const output = resolve("play-now", "play-now.html");
if (!existsSync(index)) throw new Error("Local acceptance build did not produce index.html.");
renameSync(index, output);

let html = readFileSync(output, "utf8");
const script = html.match(/<script type="module" crossorigin src="\.\/(assets\/[^\"]+\.js)"><\/script>/);
const stylesheet = html.match(/<link rel="stylesheet" crossorigin href="\.\/(assets\/[^\"]+\.css)">/);
if (!script || !stylesheet) throw new Error("Local acceptance build did not produce the expected JS and CSS references.");
const scriptSource = readFileSync(resolve("play-now", script[1]), "utf8").replace(/<\/script/gi, "<\\/script");
const stylesheetSource = readFileSync(resolve("play-now", stylesheet[1]), "utf8").replace(/<\/style/gi, "<\\/style");
html = html.replace(script[0], () => `<script type="module">${scriptSource}</script>`);
html = html.replace(stylesheet[0], () => `<style>${stylesheetSource}</style>`);
writeFileSync(output, html);
rmSync(resolve("play-now", script[1]));
rmSync(resolve("play-now", stylesheet[1]));
