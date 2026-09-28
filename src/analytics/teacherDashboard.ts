import type { AttemptEvent, ConceptProgress, QuestionType, SessionRecord } from "../types/learning";

export interface Metric { attempts: number; correct: number; accuracy: number; }
export const metric = (attempts: AttemptEvent[]): Metric => ({ attempts: attempts.length, correct: attempts.filter((item) => item.correct).length, accuracy: attempts.length ? attempts.filter((item) => item.correct).length / attempts.length : 0 });
export const questionTypeMetrics = (attempts: AttemptEvent[]) => Object.fromEntries(([
  "AUDIO_TO_PICTURE", "AUDIO_TO_WORD", "WORD_TO_PICTURE", "PICTURE_TO_WORD", "PHRASE_MATCH", "SENTENCE_MATCH",
] as QuestionType[]).map((type) => [type, metric(attempts.filter((item) => item.questionType === type))])) as Record<QuestionType, Metric>;
export const confusionDetails = (attempts: AttemptEvent[]) => {
  const counts = new Map<string, { targetConceptId: string; selectedAnswer: string; count: number }>();
  for (const attempt of attempts) { if (attempt.correct || !attempt.selectedAnswer) continue; const key = `${attempt.conceptId}:${attempt.selectedAnswer}`; const item = counts.get(key) ?? { targetConceptId: attempt.conceptId, selectedAnswer: attempt.selectedAnswer, count: 0 }; item.count++; counts.set(key, item); }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.targetConceptId.localeCompare(b.targetConceptId));
};
export const conceptDimensions = (attempts: AttemptEvent[]) => {
  const byType = questionTypeMetrics(attempts);
  return {
    listening: metric(attempts.filter((item) => item.questionType === "AUDIO_TO_PICTURE" || item.questionType === "AUDIO_TO_WORD")),
    wordReading: metric(attempts.filter((item) => item.questionType === "WORD_TO_PICTURE" || item.questionType === "PICTURE_TO_WORD")),
    phrase: byType.PHRASE_MATCH,
    sentence: byType.SENTENCE_MATCH,
    byType,
  };
};
export const durationMinutes = (session: SessionRecord) => session.completedAt ? Math.max(1, Math.round((Date.parse(session.completedAt) - Date.parse(session.startedAt)) / 60_000)) : 0;
export const dailyRows = (sessions: SessionRecord[], attempts: AttemptEvent[], days: number, now = new Date()) => Array.from({ length: days }, (_, offset) => {
  const date = new Date(now); date.setUTCDate(date.getUTCDate() - (days - offset - 1)); const key = date.toISOString().slice(0, 10); const sessionsForDay = sessions.filter((item) => item.startedAt.slice(0, 10) === key); const completed = sessionsForDay.find((item) => (item.kind ?? "daily") === "daily" && item.completedAt); const completedSessions = sessionsForDay.filter((item) => item.completedAt); const dayAttempts = attempts.filter((item) => item.createdAt.slice(0, 10) === key); return { date: key, completed: Boolean(completed), practiced: completedSessions.some((item) => (item.kind ?? "daily") !== "daily"), duration: completedSessions.reduce((sum, item) => sum + durationMinutes(item), 0), accuracy: metric(dayAttempts).accuracy, wordsReviewed: completed?.reviewConceptIds.length ?? 0, newWords: completed?.newConceptIds.length ?? 0 };
});
export const masteredCount = (progress: ConceptProgress[]) => progress.filter((item) => item.status === "mastered").length;
