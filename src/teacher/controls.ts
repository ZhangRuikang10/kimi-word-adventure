import { catalogById } from "../content/catalog";
import { createProgress } from "../engine/mastery";
import type { ConceptProgress, ReviewPriority } from "../types/learning";
import type { ProgressRepository } from "../storage/progressRepository";

export type TeacherControlPatch = Pick<ConceptProgress, "teacherIntroduced" | "schedulerEnabled" | "reviewPriority">;
export async function updateTeacherControls(repository: ProgressRepository, conceptId: string, patch: TeacherControlPatch) {
  if (!catalogById.has(conceptId)) throw new Error(`Unknown concept: ${conceptId}`);
  const prior = await repository.getConceptProgress(conceptId) ?? createProgress(conceptId);
  const next = { ...prior, ...patch };
  await repository.saveConceptProgress(next);
  await repository.addAnalytics({ id: `teacher-control-${conceptId}-${Date.now()}`, type: "teacher_control", createdAt: new Date().toISOString(), payload: { conceptId, ...patch } });
  return next;
}
export const forceReviewSoon = (repository: ProgressRepository, conceptId: string) => updateTeacherControls(repository, conceptId, { reviewPriority: "soon" as ReviewPriority });
