import { phrases } from "./phrases";
import { sentences } from "./sentences";
import { audioFor } from "./audioManifest";
import { approvedVisualsFor } from "./visualManifest";
import { wordConcepts } from "./words";

for (const concept of wordConcepts) {
  concept.visuals.core = approvedVisualsFor(concept.id).filter((asset) => asset.role === "core").map((asset) => asset.id);
  concept.visuals.variants = approvedVisualsFor(concept.id).filter((asset) => asset.role === "variant").map((asset) => asset.id);
  concept.visuals.scenes = approvedVisualsFor(concept.id).filter((asset) => asset.role === "scene").map((asset) => asset.id);
  concept.audio.word = audioFor(concept.id)?.src;
  if (!concept.audio.word) { concept.capabilities.audioToPicture = false; concept.capabilities.audioToWord = false; }
  concept.phraseIds = phrases.filter((phrase) => phrase.conceptIds.includes(concept.id)).map((phrase) => phrase.id);
  concept.sentenceIds = sentences.filter((sentence) => sentence.conceptIds.includes(concept.id)).map((sentence) => sentence.id);
  // A bridge question is only eligible when there is actual approved teaching
  // content to present; a generic capability flag alone is not enough.
  concept.capabilities.phrase &&= concept.phraseIds.length > 0;
  concept.capabilities.sentence &&= concept.sentenceIds.length > 0;
}
export { wordConcepts, phrases, sentences };
export const catalogById = new Map(wordConcepts.map((concept) => [concept.id, concept]));
