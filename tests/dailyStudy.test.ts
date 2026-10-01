import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { getDatabase } from "../src/storage/db";
import { IndexedDbProgressRepository } from "../src/storage/progressRepository";
import { answerQuestion, completeSession, continueQuestion, getTodaySession, introduceConcept, startOrResumeToday, startPracticeSession } from "../src/study/dailyStudy";
import type { Question, SessionRecord } from "../src/types/learning";

const now = new Date("2026-09-28T12:00:00Z");
const current = (session: SessionRecord) => session.interactions?.[session.currentInteractionIndex ?? 0];
const moveLearn = async (repo: IndexedDbProgressRepository, session: SessionRecord) => {
  const item = current(session); if (!item || !("kind" in item)) return false;
  await introduceConcept(repo, session.id, item.conceptId, now);
  session.currentInteractionIndex = (session.currentInteractionIndex ?? 0) + 1;
  await repo.saveSession(session);
  return true;
};
const sessionById = async (repo: IndexedDbProgressRepository, id: string) => (await repo.getSessions()).find((item) => item.id === id)!;

describe("daily study integration", () => {
  beforeEach(async () => { const db = await getDatabase(); const tx = db.transaction(["progress", "attempts", "sessions", "analytics"], "readwrite"); await Promise.all([tx.objectStore("progress").clear(), tx.objectStore("attempts").clear(), tx.objectStore("sessions").clear(), tx.objectStore("analytics").clear()]); await tx.done; });

  it("creates a resumable first-day session and puts a second miss into delayed retry", async () => {
    const repo = new IndexedDbProgressRepository(); let session = await startOrResumeToday(repo, now);
    expect(session.newConceptIds).toHaveLength(10); expect(session.reviewConceptIds).toHaveLength(15); expect(session.targetConceptIds).toHaveLength(25); expect(session.interactions?.length).toBeGreaterThanOrEqual(42);
    expect((await startOrResumeToday(repo, now)).id).toBe(session.id);
    while (await moveLearn(repo, session)) session = await sessionById(repo, session.id);
    const first = current(session) as Question; const wrong = first.options.find((id) => id !== first.targetConceptId)!;
    expect(await answerQuestion(repo, session.id, first, wrong, 400, now)).toBe("try-again");
    expect(await answerQuestion(repo, session.id, first, wrong, 500, now)).toBe("revealed");
    expect((await repo.getConceptProgress(first.targetConceptId))?.reviewPriority).toBe("soon");
    session = await sessionById(repo, session.id); expect(session.questionStates?.[first.id]?.result).toBe("revealed"); expect(session.pendingRetries).toHaveLength(2);
    expect(session.pendingRetries?.map((item) => item.reinforcementNumber)).toEqual([1, 2]);
    expect(await continueQuestion(repo, session.id, now)).toBe("correct");
    session = await sessionById(repo, session.id);
    const originalQuestionCount = (session.interactions ?? []).slice(0, session.currentInteractionIndex ?? 0).filter((item) => !("kind" in item)).length;
    for (let guard = 0; guard < 20 && !(current(session) as Question | undefined)?.isRetry; guard++) {
      if (await moveLearn(repo, session)) { session = await sessionById(repo, session.id); continue; }
      const item = current(session) as Question; await answerQuestion(repo, session.id, item, item.targetConceptId, 300, now); await continueQuestion(repo, session.id, now); session = await sessionById(repo, session.id);
    }
    const retry = current(session) as Question; expect(retry.isRetry).toBe(true);
    const retryQuestionCount = (session.interactions ?? []).slice(0, session.currentInteractionIndex ?? 0).filter((item) => !("kind" in item)).length;
    expect(retryQuestionCount - originalQuestionCount).toBeGreaterThanOrEqual(5);
    await answerQuestion(repo, session.id, retry, retry.targetConceptId, 300, now); session = await sessionById(repo, session.id);
    for (let guard = 0; guard < 30 && !((current(session) as Question | undefined)?.isRetry && (current(session) as Question).targetConceptId === first.targetConceptId); guard++) {
      if (await moveLearn(repo, session)) { session = await sessionById(repo, session.id); continue; }
      const item = current(session) as Question; await answerQuestion(repo, session.id, item, item.targetConceptId, 300, now); await continueQuestion(repo, session.id, now); session = await sessionById(repo, session.id);
    }
    expect((current(session) as Question).isRetry).toBe(true);
    expect((current(session) as Question).targetConceptId).toBe(first.targetConceptId);
  });

  it("finishes once, persists after reopening, and does not award twice", async () => {
    const repo = new IndexedDbProgressRepository(); let session = await startOrResumeToday(repo, now);
    for (let guard = 0; guard < 100 && !session.completedAt; guard++) {
      if (await moveLearn(repo, session)) { session = await sessionById(repo, session.id); continue; }
      const item = current(session) as Question;
      await answerQuestion(repo, session.id, item, item.targetConceptId, 250, now);
      await continueQuestion(repo, session.id, now);
      session = await sessionById(repo, session.id);
    }
    expect(session.completedAt).toBeTruthy(); expect(session.correctCount).toBeGreaterThanOrEqual(17); expect(session.stars).toBe(session.correctCount);
    expect((await repo.getAnalytics()).filter((event) => event.type === "session_completed")).toHaveLength(1);
    expect((await startOrResumeToday(repo, now)).id).toBe(session.id);
    expect(await completeSession(repo, session.id, now)).toBe(false);
    expect((await repo.getAnalytics()).filter((event) => event.type === "session_completed")).toHaveLength(1);
    const practice = await startPracticeSession(repo, "practice", new Date("2026-09-28T13:00:00Z"));
    expect(practice.kind).toBe("practice"); expect(practice.id).not.toBe(session.id);
    expect((await getTodaySession(repo, now))?.id).toBe(session.id);
  });
});
