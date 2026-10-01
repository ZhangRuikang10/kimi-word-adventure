import { execFileSync, execSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "public", "assets", "audio", "prompts");
const provider = "Google Cloud Text-to-Speech / Gemini TTS";
const model = "gemini-2.5-flash-tts";
const voice = "Kore";
const locale = "en-GB";
const googleProject = "kimi-english-tts-test";
const stylePrompt = "Speak only the exact text. Use a warm, clear, friendly British English voice for a five- to six-year-old child. Speak slightly slower than ordinary adult conversation, with clean word boundaries. Do not add words, sounds, music, or dramatic acting.";
const prompts = [
  ["what-colour-is-it.mp3", "What colour is it?"],
  ["what-is-the-action.mp3", "What is the action?"],
  ["how-do-they-feel.mp3", "How do they feel?"],
  ["who-is-this.mp3", "Who is this?"],
  ["which-greeting-is-it.mp3", "Which greeting is it?"],
  ["what-is-this.mp3", "What is this?"],
  ["how-many.mp3", "How many?"],
];

function token() {
  if (process.platform === "win32") return execSync('"C:\\Program Files (x86)\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud.cmd" auth application-default print-access-token', { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  return execFileSync("gcloud", ["auth", "application-default", "print-access-token"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}
function validMp3(buffer) { return buffer.length > 1024 && (buffer.subarray(0, 3).toString() === "ID3" || buffer[0] === 0xff); }
async function synthesize(text) {
  const response = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", { method: "POST", headers: { Authorization: `Bearer ${token()}`, "x-goog-user-project": googleProject, "Content-Type": "application/json" }, body: JSON.stringify({ input: { text, prompt: stylePrompt }, voice: { languageCode: locale, name: voice, modelName: model }, audioConfig: { audioEncoding: "MP3", sampleRateHertz: 24000 } }) });
  if (!response.ok) throw new Error(`TTS request failed (${response.status})`);
  const audio = Buffer.from((await response.json()).audioContent ?? "", "base64");
  if (!validMp3(audio)) throw new Error(`Invalid MP3 generated for ${text}`);
  return audio;
}
await mkdir(outputDir, { recursive: true });
for (const [file, text] of prompts) {
  const destination = path.join(outputDir, file);
  if (!existsSync(destination)) await writeFile(destination, await synthesize(text));
  const audio = await readFile(destination);
  if (!validMp3(audio)) throw new Error(`Invalid prompt MP3: ${file}`);
}
console.log(`Generated ${prompts.length} local question-prompt MP3 files with ${provider} / ${model}.`);
