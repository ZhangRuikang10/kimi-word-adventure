import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { audioAssets } from "../src/content/audioManifest.ts";
import { phrases, sentences, wordConcepts } from "../src/content/catalog.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const publicPath = (src: string) => join(process.cwd(), "public", src.replace(/^\//, ""));
const audioRoot = join(process.cwd(), "public", "assets", "audio");
const provider = "Google Cloud Text-to-Speech / Gemini TTS";
const model = "gemini-2.5-flash-tts";
const voice = "Kore";
const locale = "en-GB";
const knownTeachingTextCollisions = new Set(["word:orange"]);

function isMp3(path: string) {
  const header = readFileSync(path).subarray(0, 3);
  return header.toString() === "ID3" || header[0] === 0xff;
}

function probe(path: string) {
  return execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,sample_rate,channels", "-of", "csv=p=0", path], { stdio: "pipe" }).toString().trim();
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[.!?]+$/g, "").replace(/\s+/g, " ").trim();
}

const ids = new Set<string>();
const paths = new Set<string>();
const teachingText = new Map<string, string[]>();

for (const asset of audioAssets) {
  assert(!ids.has(asset.id), `Duplicate audio ID: ${asset.id}`);
  ids.add(asset.id);
  assert(asset.src.startsWith("/assets/audio/"), `Audio must be stored in Word Adventure audio tree: ${asset.id}`);
  assert(!paths.has(asset.src), `Path collision: ${asset.src}`);
  paths.add(asset.src);
  assert(asset.provider === provider, `Provider mismatch: ${asset.id}`);
  assert(asset.model === model, `Model mismatch: ${asset.id}`);
  assert(asset.voice === voice, `Voice mismatch: ${asset.id}`);
  assert(asset.locale === locale, `Locale mismatch: ${asset.id}`);
  assert(asset.source === "reused" || asset.source === "newly-generated", `Invalid source: ${asset.id}`);
  assert(asset.approvalStatus === "approved" || asset.approvalStatus === "pending-human-QA", `Invalid approval status: ${asset.id}`);
  assert(asset.approved === (asset.approvalStatus === "approved"), `Approved boolean/status mismatch: ${asset.id}`);
  // New recordings are initially pending human QA; after a reviewer approves
  // them they retain their provenance and become valid production audio.
  assert(!(asset.source === "reused" && asset.approvalStatus !== "approved"), `Reused course audio should be approved: ${asset.id}`);

  const full = publicPath(asset.src);
  assert(existsSync(full), `Manifest points to missing MP3: ${asset.id} ${asset.src}`);
  assert(isMp3(full), `Not an MP3 file: ${asset.id}`);
  const details = probe(full);
  assert(/mp3,24000,1/.test(details), `Unexpected MP3 format for ${asset.id}: ${details}`);

  if (asset.level === "word") assert(Boolean(asset.conceptId) && !asset.phraseId && !asset.sentenceId, `Word audio level mismatch: ${asset.id}`);
  if (asset.level === "phrase") assert(Boolean(asset.phraseId) && !asset.conceptId && !asset.sentenceId, `Phrase audio level mismatch: ${asset.id}`);
  if (asset.level === "sentence") assert(Boolean(asset.sentenceId) && !asset.conceptId && !asset.phraseId, `Sentence audio level mismatch: ${asset.id}`);

  const textKey = `${asset.level}:${normalizeText(asset.text)}`;
  teachingText.set(textKey, [...(teachingText.get(textKey) ?? []), asset.id]);
}

for (const [key, values] of teachingText) {
  assert(values.length === 1 || knownTeachingTextCollisions.has(key), `Unexpected teaching text collision: ${key} ${values.join(", ")}`);
}

const wordAssets = new Map(audioAssets.filter((asset) => asset.level === "word").map((asset) => [asset.conceptId, asset]));
const phraseAssets = new Map(audioAssets.filter((asset) => asset.level === "phrase").map((asset) => [asset.phraseId, asset]));
const sentenceAssets = new Map(audioAssets.filter((asset) => asset.level === "sentence").map((asset) => [asset.sentenceId, asset]));

for (const concept of wordConcepts) assert(wordAssets.has(concept.id), `Missing word-level audio for concept: ${concept.id}`);
for (const phrase of phrases) assert(phraseAssets.has(phrase.id), `Missing phrase-level audio: ${phrase.id}`);
for (const sentence of sentences) assert(sentenceAssets.has(sentence.id), `Missing sentence-level audio: ${sentence.id}`);

const manifestPaths = new Set(audioAssets.map((asset) => publicPath(asset.src)));
for (const level of ["words", "phrases", "sentences"]) {
  const dir = join(audioRoot, level);
  assert(existsSync(dir), `Missing audio directory: ${level}`);
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".mp3")) continue;
    const full = join(dir, file);
    assert(manifestPaths.has(full), `Orphan MP3 not registered in manifest: ${full}`);
  }
}

console.log(JSON.stringify({
  required: { words: wordConcepts.length, phrases: phrases.length, sentences: sentences.length },
  manifest: {
    total: audioAssets.length,
    words: [...wordAssets].length,
    phrases: [...phraseAssets].length,
    sentences: [...sentenceAssets].length,
    reusedApproved: audioAssets.filter((asset) => asset.source === "reused" && asset.approvalStatus === "approved").length,
    newlyGeneratedApproved: audioAssets.filter((asset) => asset.source === "newly-generated" && asset.approvalStatus === "approved").length,
    pendingHumanQa: audioAssets.filter((asset) => asset.approvalStatus === "pending-human-QA").length,
  },
  requiredProductionAudioMissing: 0,
  knownTeachingTextCollisions: [...teachingText.entries()].filter(([, values]) => values.length > 1).map(([key, values]) => ({ key, ids: values })),
}, null, 2));
