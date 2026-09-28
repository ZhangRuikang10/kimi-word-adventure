import type { ConceptProgress } from "../types/learning";
export const REVIEW_DAYS = [0, 1, 3, 7, 14, 30] as const;
export function scheduleNextReview(progress: ConceptProgress, correct: boolean, now = new Date()): ConceptProgress {
  const next = structuredClone(progress); next.lastReviewedAt = now.toISOString(); next.intervalStage = correct ? Math.min(next.intervalStage + 1, REVIEW_DAYS.length - 1) : 0;
  const due = new Date(now); due.setUTCDate(due.getUTCDate() + REVIEW_DAYS[next.intervalStage]!); next.nextReviewAt = due.toISOString(); return next;
}
