import type { Question, QuestionType } from "../types/learning";
export const NORMAL_TARGET_GAP = 4;
export const RETRY_GAP_MIN = 5;
export function canAppendQuestion(history: Question[], candidate: Question): boolean {
  const prior = [...history].reverse().find((question) => question.targetConceptId === candidate.targetConceptId);
  if (prior) { const index = history.lastIndexOf(prior); const gap = history.length - index - 1; if (gap < (candidate.isRetry ? RETRY_GAP_MIN : NORMAL_TARGET_GAP)) return false; if (prior.type === candidate.type && !candidate.isRetry) return false; }
  const lastTypes = history.slice(-2).map((question) => question.type); if (lastTypes.length === 2 && lastTypes.every((type) => type === candidate.type)) return false;
  const lastCategories = history.slice(-4).map((question) => question.category); return !(lastCategories.length === 4 && lastCategories.every((category) => category === candidate.category));
}
export function chooseBalancedAnswerIndex(history: Question[], optionCount: number, preferred: number): number {
  const recent = history.slice(-8); const counts = Array.from({ length: optionCount }, (_, index) => recent.filter((question) => question.correctOptionIndex === index).length); const min = Math.min(...counts);
  return counts[preferred] === min ? preferred : counts.findIndex((count) => count === min);
}
export function checkQuestionSequence(questions: Question[]): string[] {
  const problems: string[] = []; questions.forEach((question, index) => { if (!canAppendQuestion(questions.slice(0,index), question)) problems.push(`Question ${index} violates anti-pattern rules`); }); return problems;
}
export const questionTypesFor = (type: QuestionType): string => type;
