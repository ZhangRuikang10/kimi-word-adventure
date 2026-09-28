import { describe, expect, it } from "vitest";
import { wordConcepts } from "../src/content/words";
import { createProgress } from "../src/engine/mastery";
import { buildDailyAssignment } from "../src/engine/scheduler";

describe("daily scheduler", () => {
  const now = new Date("2026-09-28T12:00:00Z");
  it("bootstraps a unique 10 new + 15 review day from previously taught core vocabulary", () => {
    const assignment = buildDailyAssignment({ catalog: wordConcepts, progress: [], now });
    expect(assignment.newConceptIds).toHaveLength(10); expect(assignment.reviewConceptIds).toHaveLength(15);
    expect(new Set([...assignment.newConceptIds, ...assignment.reviewConceptIds]).size).toBe(25);
    expect(assignment.reviewConceptIds.every((id) => assignment.targetSources?.[id] === "bootstrap-review")).toBe(true);
  });
  it("keeps scheduled due reviews ahead of bootstrap cards and does not auto-enable gated numbers", () => {
    const due = wordConcepts.filter((concept) => concept.enabledByDefault).slice(12, 17).map((concept, index) => ({ ...createProgress(concept.id), introducedAt: "2026-09-01T00:00:00Z", status: "learning" as const, nextReviewAt: new Date(now.getTime() - (index + 1) * 1000).toISOString(), totalAttempts: 10, correctAttempts: 8 }));
    const assignment = buildDailyAssignment({ catalog: wordConcepts, progress: due, now });
    expect(new Set(assignment.reviewConceptIds.slice(0, 5))).toEqual(new Set(due.map((item) => item.conceptId)));
    expect(assignment.reviewConceptIds.slice(0, 5).every((id) => assignment.targetSources?.[id] === "scheduled-review")).toBe(true);
    expect([...assignment.newConceptIds, ...assignment.reviewConceptIds].some((id) => /^number-(08|09|10|1[1-9]|20)$/.test(id))).toBe(false);
  });
  it("requires an explicit teacher enable before a gated number can enter the scheduler", () => {
    const candidate = wordConcepts.find((concept) => concept.id === "number-08")!;
    const disabled = buildDailyAssignment({ catalog: wordConcepts, progress: [{ ...createProgress(candidate.id), teacherIntroduced: true }], now });
    expect([...disabled.newConceptIds, ...disabled.reviewConceptIds]).not.toContain(candidate.id);
    const introducedCore = wordConcepts.filter((concept) => concept.enabledByDefault).map((concept) => ({ ...createProgress(concept.id), introducedAt: "2026-09-01T00:00:00Z", status: "learning" as const, nextReviewAt: "2026-10-30T00:00:00Z" }));
    const enabled = buildDailyAssignment({ catalog: wordConcepts, progress: [...introducedCore, { ...createProgress(candidate.id), teacherIntroduced: true, schedulerEnabled: true }], now });
    expect(enabled.newConceptIds).toContain(candidate.id);
  });
  it("builds day two from scheduled reviews plus bootstrap top-up and new concepts", () => {
    const dayOne = buildDailyAssignment({ catalog: wordConcepts, progress: [], now });
    const progress = dayOne.newConceptIds.map((id) => ({ ...createProgress(id), introducedAt: now.toISOString(), status: "learning" as const, nextReviewAt: now.toISOString(), totalAttempts: 2, correctAttempts: 2 }));
    const dayTwo = buildDailyAssignment({ catalog: wordConcepts, progress, now: new Date("2026-09-29T12:00:00Z") });
    expect(dayTwo.newConceptIds).toHaveLength(10); expect(dayTwo.reviewConceptIds).toHaveLength(15);
    expect(dayTwo.reviewConceptIds.filter((id) => dayTwo.targetSources?.[id] === "scheduled-review")).toHaveLength(10);
    expect(dayTwo.reviewConceptIds.filter((id) => dayTwo.targetSources?.[id] === "bootstrap-review")).toHaveLength(5);
  });
});
