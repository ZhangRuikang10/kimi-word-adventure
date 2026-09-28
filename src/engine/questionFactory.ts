import { catalogById as conceptById } from "../content/catalog";
import { approvedVisualsFor } from "../content/visualManifest";
import type { Question, QuestionCapabilities, QuestionType } from "../types/learning";
import { SeededRandom } from "./random";

const capabilityKey: Record<QuestionType, keyof QuestionCapabilities> = { WORD_TO_PICTURE:"wordToPicture", AUDIO_TO_PICTURE:"audioToPicture", PICTURE_TO_WORD:"pictureToWord", AUDIO_TO_WORD:"audioToWord", PHRASE_MATCH:"phrase", SENTENCE_MATCH:"sentence" };
export function availableTypes(conceptId: string): QuestionType[] { const concept = conceptById.get(conceptId); if (!concept) throw new Error(`Unknown concept ${conceptId}`); return (Object.entries(capabilityKey) as [QuestionType, keyof typeof concept.capabilities][]).filter(([,key]) => concept.capabilities[key]).map(([type]) => type); }
export function createQuestion(conceptId: string, type: QuestionType, random: SeededRandom, priorVisualIds: string[] = [], priorQuestions: Question[] = [], isRetry = false): Question {
  const concept = conceptById.get(conceptId); if (!concept) throw new Error(`Unknown concept ${conceptId}`); if (!concept.capabilities[capabilityKey[type]]) throw new Error(`${type} unavailable for ${conceptId}`);
  const preferredDistractors = random.shuffle(concept.distractorPool);
  // Small categories (notably greetings) still need four distinct choices.
  // Broaden only after their pedagogically close pool is exhausted.
  const fallbackDistractors = random.shuffle([...conceptById.keys()].filter((id) => id !== conceptId && !preferredDistractors.includes(id)));
  const distractors = [...preferredDistractors, ...fallbackDistractors].slice(0, 3);
  const slot = random.pick([0,1,2,3]); const options = [...distractors]; options.splice(slot,0,conceptId);
  const optionVisualAssetIds = Object.fromEntries(options.flatMap((option) => {
    const choices = approvedVisualsFor(option).filter((asset) => option === conceptId || !asset.avoidAsDistractorFor?.includes(conceptId));
    const unused = option === conceptId ? choices.filter((asset) => !priorVisualIds.includes(asset.id)) : choices;
    const selected = (unused.length ? random.pick(unused) : choices.length ? random.pick(choices) : undefined)?.id;
    return selected ? [[option, selected]] : [];
  }));
  const visualAssetId = optionVisualAssetIds[conceptId];
  return { id: `${conceptId}-${type}-${Math.floor(random.next()*1e9)}`, targetConceptId: conceptId, type, category: concept.category, options, correctOptionIndex: slot, visualAssetId, optionVisualAssetIds, isRetry };
}
