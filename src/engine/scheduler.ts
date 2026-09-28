import type { ConceptProgress, DailyAssignment, ReviewSource, WordConcept } from "../types/learning";

export interface SchedulerInput { catalog: WordConcept[]; progress: ConceptProgress[]; now: Date; teacherEnabledIds?: Set<string>; pausedNewWords?: boolean; }

const REVIEW_QUOTA = 15;
const NEW_QUOTA = 10;
const byScore = (progress: Map<string, ConceptProgress>, now: Date) => (a: WordConcept, b: WordConcept) => score(progress.get(b.id), now) - score(progress.get(a.id), now) || a.id.localeCompare(b.id);
const isDue = (item: ConceptProgress | undefined, now: Date) => Boolean(item?.introducedAt && item.nextReviewAt && Date.parse(item.nextReviewAt) <= now.getTime());
const courseTaughtByDefault = (concept: WordConcept) => concept.curriculumStatus === "core";

/**
 * New means new to Word Adventure, not new to English. Bootstrap reviews fill
 * a short due queue with teacher-taught concepts, while preserving spaced
 * review provenance for analytics and scheduling.
 */
export function buildDailyAssignment({ catalog, progress, now, teacherEnabledIds = new Set<string>(), pausedNewWords = false }: SchedulerInput): DailyAssignment {
  const byId = new Map(progress.map((item) => [item.conceptId, item]));
  const eligible = catalog.filter((concept) => {
    const controls = byId.get(concept.id);
    if (controls?.schedulerEnabled === false) return false;
    return concept.enabledByDefault || teacherEnabledIds.has(concept.id) || controls?.schedulerEnabled === true;
  });
  const newConceptIds = pausedNewWords ? [] : eligible.filter((concept) => !byId.get(concept.id)?.introducedAt).slice(0, NEW_QUOTA).map((concept) => concept.id);
  const excluded = new Set(newConceptIds); const targetSources: Record<string, ReviewSource> = Object.fromEntries(newConceptIds.map((id) => [id, "new"]));
  const selectable = eligible.filter((concept) => !excluded.has(concept.id));
  const selected: string[] = [];
  const take = (concepts: WordConcept[], source: Exclude<ReviewSource, "new">) => {
    for (const concept of concepts) { if (selected.length >= REVIEW_QUOTA || excluded.has(concept.id)) continue; selected.push(concept.id); excluded.add(concept.id); targetSources[concept.id] = source; }
  };

  // Due cards retain absolute priority and are never relabelled as bootstrap.
  take(selectable.filter((concept) => isDue(byId.get(concept.id), now)).sort(byScore(byId, now)), "scheduled-review");
  take(selectable.filter((concept) => !excluded.has(concept.id) && byId.get(concept.id)?.reviewPriority === "soon").sort(byScore(byId, now)), "weak-word-review");
  // A weak existing word is useful even when it is not formally due yet.
  take(selectable.filter((concept) => { const item = byId.get(concept.id); return !excluded.has(concept.id) && Boolean(item?.introducedAt && item.totalAttempts >= 2 && item.correctAttempts / item.totalAttempts < .6); }).sort(byScore(byId, now)), "weak-word-review");
  take(selectable.filter((concept) => !excluded.has(concept.id) && (byId.get(concept.id)?.teacherIntroduced ?? courseTaughtByDefault(concept))).sort((a, b) => a.id.localeCompare(b.id)), "bootstrap-review");
  return { newConceptIds, reviewConceptIds: selected, targetSources };
}

function score(progress: ConceptProgress | undefined, now: Date): number {
  if (!progress) return -Infinity; const overdueDays = progress.nextReviewAt ? Math.max(0, now.getTime() - Date.parse(progress.nextReviewAt)) / 86_400_000 : 0;
  const weakness = progress.totalAttempts ? 1 - progress.correctAttempts / progress.totalAttempts : 0; const missingDimensions = Object.values(progress.mastery).filter((value) => value < 50).length;
  return overdueDays * 10 + weakness * 8 + missingDimensions + (progress.reviewPriority === "soon" ? 100 : 0);
}
