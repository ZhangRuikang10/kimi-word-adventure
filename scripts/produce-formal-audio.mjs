import { execFileSync, execSync } from "node:child_process";
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { phrases, sentences, wordConcepts } from "../src/content/catalog.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.resolve(root, "..", "kimi-english-learning-publish_Copy");
const publicRoot = path.join(root, "public");
const audioRoot = path.join(publicRoot, "assets", "audio");
const provider = "Google Cloud Text-to-Speech / Gemini TTS";
const model = "gemini-2.5-flash-tts";
const voice = "Kore";
const locale = "en-GB";
const googleProject = "kimi-english-tts-test";
const stylePrompt = "Speak only the exact text. Use a warm, clear, friendly British English voice for a five- to six-year-old child. Speak slightly slower than ordinary adult conversation, with clean word boundaries and natural short pauses. Do not add words, sounds, music, or dramatic acting.";

const forced = new Set(process.argv.filter((value) => value.startsWith("--regenerate=")).map((value) => value.slice("--regenerate=".length)));

const sentenceSpokenText = new Map([
  ["sentence-age-answer", "I'm five. I'm six."],
  ["sentence-feeling-answer", "I'm happy. I'm sad. I'm tired."],
  ["sentence-gender-answer", "I'm a boy. I'm a girl."],
  ["sentence-colour-answer", "It's red. It's blue."],
  ["sentence-count-answer", "Three apples. Four books."],
]);

const wordStemOverrides = new Map([
  ["colour-orange", "orange-colour"],
  ["object-orange-fruit", "orange-fruit"],
]);

function titleCaseFirst(value) {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

function normalizeText(value) {
  return value.toLowerCase().replace(/[.!?]+$/g, "").replace(/\s+/g, " ").trim();
}

function slug(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
}

function punctuate(value) {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function wordText(display) {
  return punctuate(titleCaseFirst(display));
}

function parseCsv(csv) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") value += char;
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

async function approvedCourseAudio() {
  const approved = new Map();
  for (const lesson of ["lesson-01", "lesson-02", "lesson-03"]) {
    const manifest = path.join(sourceRoot, "assets", "audio", lesson, `${lesson}-audio-manifest.csv`);
    if (!existsSync(manifest)) continue;
    const rows = parseCsv(await readFile(manifest, "utf8"));
    const header = rows.shift();
    const index = (name) => header.indexOf(name);
    for (const row of rows) {
      const status = row[index("ApprovalStatus")] || "";
      if (!["Approved", "REUSED_APPROVED"].includes(status)) continue;
      const text = row[index("TeachingText")];
      const mp3 = row[index("Mp3File")];
      const source = path.join(sourceRoot, "assets", "audio", lesson, "mp3", mp3);
      if (!text || !mp3 || !existsSync(source)) continue;
      approved.set(normalizeText(text), { text, mp3, lesson, source });
    }
  }
  return approved;
}

function requirements() {
  const words = wordConcepts.map((concept) => ({
    id: `audio-word-${concept.id}`,
    level: "word",
    text: wordText(concept.display),
    spokenText: wordText(concept.display),
    file: `${wordStemOverrides.get(concept.id) ?? slug(concept.display)}.mp3`,
    conceptId: concept.id,
  }));
  const phraseItems = phrases.map((phrase) => ({
    id: `audio-${phrase.id}`,
    level: "phrase",
    text: punctuate(titleCaseFirst(phrase.text)),
    spokenText: punctuate(titleCaseFirst(phrase.text)),
    file: `${slug(phrase.text)}.mp3`,
    phraseId: phrase.id,
  }));
  const sentenceItems = sentences.map((sentence) => {
    const spokenText = sentenceSpokenText.get(sentence.id) ?? sentence.text;
    return {
      id: `audio-${sentence.id}`,
      level: "sentence",
      text: sentence.text,
      spokenText,
      file: `${slug(spokenText)}.mp3`,
      sentenceId: sentence.id,
    };
  });
  return [...words, ...phraseItems, ...sentenceItems];
}

function getAdcToken() {
  if (process.platform === "win32") {
    const command = '"C:\\Program Files (x86)\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud.cmd" auth application-default print-access-token';
    return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  }
  return execFileSync("gcloud", ["auth", "application-default", "print-access-token"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

async function synthesize(text) {
  const token = getAdcToken();
  const response = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "x-goog-user-project": googleProject, "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text, prompt: stylePrompt },
      voice: { languageCode: locale, name: voice, modelName: model },
      audioConfig: { audioEncoding: "MP3", sampleRateHertz: 24000 },
    }),
  });
  if (!response.ok) throw new Error(`Gemini TTS request failed with HTTP ${response.status}: ${await response.text()}`);
  const payload = await response.json();
  const audio = Buffer.from(payload.audioContent || "", "base64");
  if (!isMp3(audio)) throw new Error(`Gemini TTS returned invalid MP3 for: ${text}`);
  return audio;
}

function isMp3(buffer) {
  return buffer.length > 1024 && (buffer.subarray(0, 3).toString() === "ID3" || buffer[0] === 0xff);
}

async function assertMp3(file) {
  const buffer = await readFile(file);
  if (!isMp3(buffer)) throw new Error(`Invalid MP3 file: ${file}`);
  try {
    const details = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,sample_rate,channels", "-of", "csv=p=0", file], { stdio: "pipe" }).toString().trim();
    if (!/mp3,24000,1/.test(details)) throw new Error(`Unexpected MP3 format for ${file}: ${details}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Unexpected MP3 format")) throw error;
  }
}

function quoteTs(value) {
  return JSON.stringify(value);
}

async function writeAudioManifest(entries) {
  const lines = [
    'import type { AudioAsset } from "../types/learning";',
    "",
    "export const audioAssets: AudioAsset[] = [",
    ...entries.map((entry) => {
      const ids = [
        entry.conceptId ? `conceptId: ${quoteTs(entry.conceptId)}` : "",
        entry.phraseId ? `phraseId: ${quoteTs(entry.phraseId)}` : "",
        entry.sentenceId ? `sentenceId: ${quoteTs(entry.sentenceId)}` : "",
      ].filter(Boolean).join(", ");
      const spoken = entry.spokenText !== entry.text ? `, spokenText: ${quoteTs(entry.spokenText)}` : "";
      return `  { id: ${quoteTs(entry.id)}, level: ${quoteTs(entry.level)}, text: ${quoteTs(entry.text)}${spoken}, src: ${quoteTs(entry.src)}, ${ids}, provider: ${quoteTs(provider)}, model: ${quoteTs(model)}, voice: ${quoteTs(voice)}, locale: ${quoteTs(locale)}, approved: ${entry.approved}, approvalStatus: ${quoteTs(entry.approvalStatus)}, source: ${quoteTs(entry.source)} },`;
    }),
    "];",
    "",
    'export const wordAudioAssets = audioAssets.filter((asset) => asset.level === "word");',
    'export const phraseAudioAssets = audioAssets.filter((asset) => asset.level === "phrase");',
    'export const sentenceAudioAssets = audioAssets.filter((asset) => asset.level === "sentence");',
    'export const audioFor = (conceptId: string) => wordAudioAssets.find((asset) => asset.conceptId === conceptId);',
    'export const phraseAudioFor = (phraseId: string) => phraseAudioAssets.find((asset) => asset.phraseId === phraseId);',
    'export const sentenceAudioFor = (sentenceId: string) => sentenceAudioAssets.find((asset) => asset.sentenceId === sentenceId);',
    "",
  ];
  await writeFile(path.join(root, "src", "content", "audioManifest.ts"), `${lines.join("\n")}`);
}

function qaRows(entries, level) {
  return entries.filter((entry) => entry.level === level).map((entry) => `| ${entry.conceptId ?? entry.phraseId ?? entry.sentenceId} | ${entry.text.replaceAll("|", "\\|")} | ${entry.src.split("/").pop()} | ${entry.source} | ${entry.approvalStatus} |`).join("\n");
}

async function writeQaChecklist(entries, summary) {
  const content = `# AUDIO-QA-CHECKLIST

Formal audio production QA checklist for Kimi Word Adventure V1.

- Provider: ${provider}
- Model: \`${model}\`
- Voice: \`${voice}\`
- Locale: \`${locale}\`
- Format: MP3

## Summary

- Word MP3: ${summary.word.total} total, ${summary.word.reused} reused approved, ${summary.word.newlyGenerated} newly generated pending-human-QA
- Phrase MP3: ${summary.phrase.total} total, ${summary.phrase.reused} reused approved, ${summary.phrase.newlyGenerated} newly generated pending-human-QA
- Sentence MP3: ${summary.sentence.total} total, ${summary.sentence.reused} reused approved, ${summary.sentence.newlyGenerated} newly generated pending-human-QA

## Human QA focus

- pronunciation
- speed
- pause
- stress
- connected speech
- distortion / clipping
- unnatural rhythm
- sentence ending
- colour words
- numbers
- classroom actions
- short function-word phrases

## Words

| ID | Text | Filename | Source | QA status |
|---|---|---|---|---|
${qaRows(entries, "word")}

## Phrases

| ID | Text | Filename | Source | QA status |
|---|---|---|---|---|
${qaRows(entries, "phrase")}

## Sentences

| ID | Text | Filename | Source | QA status |
|---|---|---|---|---|
${qaRows(entries, "sentence")}
`;
  await writeFile(path.join(root, "AUDIO-QA-CHECKLIST.md"), content);
}

async function writeCoverageReport(entries, summary) {
  const textCollisions = new Map();
  for (const entry of entries) {
    const key = `${entry.level}:${normalizeText(entry.text)}`;
    const list = textCollisions.get(key) ?? [];
    list.push(entry.id);
    textCollisions.set(key, list);
  }
  const collisions = [...textCollisions.entries()].filter(([, ids]) => ids.length > 1);
  const content = `# AUDIO-COVERAGE-AUDIT

Generated by \`pnpm produce:audio\`.

## Coverage

| Level | Required | Reused approved | Newly generated | Missing MP3 |
|---|---:|---:|---:|---:|
| word | ${summary.word.total} | ${summary.word.reused} | ${summary.word.newlyGenerated} | 0 |
| phrase | ${summary.phrase.total} | ${summary.phrase.reused} | ${summary.phrase.newlyGenerated} | 0 |
| sentence | ${summary.sentence.total} | ${summary.sentence.reused} | ${summary.sentence.newlyGenerated} | 0 |

## Known teaching-text collisions

${collisions.length ? collisions.map(([key, ids]) => `- ${key}: ${ids.join(", ")}`).join("\n") : "- None"}

## Notes

- Existing course MP3s are reused only when the source manifest status is \`Approved\` or \`REUSED_APPROVED\` and the teaching text matches as an independent unit.
- Newly generated MP3s are registered as \`pending-human-QA\`, not as human approved.
- Sentence/frame entries containing slashes are synthesized from explicit spoken alternatives recorded in \`spokenText\`.
`;
  await writeFile(path.join(root, "AUDIO-COVERAGE-AUDIT.md"), content);
}

async function cleanOrphans(entries) {
  const expected = new Set(entries.map((entry) => path.join(publicRoot, entry.src.replace(/^\//, ""))));
  for (const level of ["words", "phrases", "sentences"]) {
    const dir = path.join(audioRoot, level);
    if (!existsSync(dir)) continue;
    for (const file of await readdir(dir)) {
      if (!file.endsWith(".mp3")) continue;
      const full = path.join(dir, file);
      if (!expected.has(full)) await rm(full, { force: true });
    }
  }
}

async function main() {
  const approved = await approvedCourseAudio();
  const planned = requirements();
  const entries = [];
  for (const item of planned) {
    const dirName = item.level === "word" ? "words" : `${item.level}s`;
    const dir = path.join(audioRoot, dirName);
    await mkdir(dir, { recursive: true });
    const destination = path.join(dir, item.file);
    const src = `/assets/audio/${dirName}/${item.file}`;
    const reusable = approved.get(normalizeText(item.spokenText));
    const entry = { ...item, src, provider, model, voice, locale };
    if (reusable) {
      await copyFile(reusable.source, destination);
      await assertMp3(destination);
      entries.push({ ...entry, source: "reused", approvalStatus: "approved", approved: true });
      continue;
    }
    if (!existsSync(destination) || forced.has(item.id) || forced.has(item.spokenText)) {
      await writeFile(destination, await synthesize(item.spokenText));
    }
    await assertMp3(destination);
    entries.push({ ...entry, source: "newly-generated", approvalStatus: "pending-human-QA", approved: false });
  }
  await cleanOrphans(entries);
  await writeAudioManifest(entries);
  const summary = Object.fromEntries(["word", "phrase", "sentence"].map((level) => {
    const scoped = entries.filter((entry) => entry.level === level);
    return [level, {
      total: scoped.length,
      reused: scoped.filter((entry) => entry.source === "reused").length,
      newlyGenerated: scoped.filter((entry) => entry.source === "newly-generated").length,
    }];
  }));
  await writeQaChecklist(entries, summary);
  await writeCoverageReport(entries, summary);
  console.log(JSON.stringify({ totalAudio: entries.length, ...summary }, null, 2));
}

await main();
