import type { ConceptProgress, QuestionType, SkillMastery } from "../types/learning";

export const blankMastery = (): SkillMastery => ({ pictureMeaning: 0, listeningMeaning: 0, wordReading: 0, phraseUnderstanding: 0, sentenceUnderstanding: 0, visualTransfer: 0 });
export const createProgress = (conceptId: string): ConceptProgress => ({ conceptId, status: "new", intervalStage: 0, mastery: blankMastery(), totalAttempts: 0, correctAttempts: 0, currentStreak: 0, recentVariantIds: [], seenQuestionTypes: [], sessionIds: [] });
const dimensions = { WORD_TO_PICTURE: "pictureMeaning", AUDIO_TO_PICTURE: "listeningMeaning", PICTURE_TO_WORD: "wordReading", AUDIO_TO_WORD: "listeningMeaning", PHRASE_MATCH: "phraseUnderstanding", SENTENCE_MATCH: "sentenceUnderstanding" } as const satisfies Record<QuestionType, keyof SkillMastery>;
const dimensionFor = (type: QuestionType): keyof SkillMastery => dimensions[type];
export function applyMastery(progress: ConceptProgress, type: QuestionType, correct: boolean, visualVariantId?: string): ConceptProgress {
  const next = structuredClone(progress); const dimension = dimensionFor(type); next.totalAttempts++; next.correctAttempts += Number(correct); next.currentStreak = correct ? next.currentStreak + 1 : 0;
  next.mastery[dimension] = Math.max(0, Math.min(100, next.mastery[dimension] + (correct ? 18 : -12)));
  if (visualVariantId) { const unseen = !next.recentVariantIds.includes(visualVariantId); next.recentVariantIds = [...next.recentVariantIds, visualVariantId].slice(-8); if (unseen && correct) next.mastery.visualTransfer = Math.min(100, next.mastery.visualTransfer + 20); }
  if (next.totalAttempts >= 3 && next.correctAttempts / next.totalAttempts >= 0.6) next.status = "learning";
  if (next.currentStreak >= 4 && Object.values(next.mastery).filter((value) => value >= 50).length >= 2) next.status = "good";
  if (next.currentStreak >= 7 && next.seenQuestionTypes.length >= 2 && next.recentVariantIds.length >= 2 && next.mastery.visualTransfer >= 40) next.status = "mastered";
  if (!next.seenQuestionTypes.includes(type)) next.seenQuestionTypes.push(type);
  return next;
}
