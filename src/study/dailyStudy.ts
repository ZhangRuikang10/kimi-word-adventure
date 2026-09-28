import { catalogById, wordConcepts } from "../content/catalog";
import { createProgress, applyMastery } from "../engine/mastery";
import { buildDailyAssignment } from "../engine/scheduler";
import { buildSessionPlan, createDelayedRetry } from "../engine/sessionBuilder";
import { scheduleNextReview } from "../engine/spacedReview";
import { canAppendQuestion, chooseBalancedAnswerIndex } from "../engine/antiPattern";
import { availableTypes, createQuestion } from "../engine/questionFactory";
import { SeededRandom } from "../engine/random";
import type { AttemptEvent, ConceptProgress, Question, SessionInteraction, SessionKind, SessionRecord } from "../types/learning";
import type { ProgressRepository } from "../storage/progressRepository";

export type AnswerResult = "correct" | "try-again" | "delayed-retry" | "finished";

const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const questionCountBefore = (interactions: SessionInteraction[], endExclusive: number) => interactions.slice(0, endExclusive).filter((item) => !("kind" in item)).length;
const sessionById = async (repository: ProgressRepository, id: string) => (await repository.getSessions()).find((session) => session.id === id);
const sessionKind = (session: SessionRecord): SessionKind => session.kind ?? "daily";

export async function getSession(repository: ProgressRepository, id: string) { return sessionById(repository, id); }

export async function getTodaySession(repository: ProgressRepository, now = new Date()) {
  const key = dayKey(now);
  return (await repository.getSessions()).find((session) => sessionKind(session) === "daily" && dayKey(new Date(session.startedAt)) === key);
}

/** Create one assignment per calendar day, or restore the saved daily session. */
export async function startOrResumeToday(repository: ProgressRepository, now = new Date()): Promise<SessionRecord> {
  const existing = await getTodaySession(repository, now);
  if (existing) return existing;
  const progress = await repository.getAllConceptProgress();
  const assignment = buildDailyAssignment({ catalog: wordConcepts, progress, now });
  const seed = `${dayKey(now)}-${Math.random().toString(36).slice(2, 10)}`;
  const plan = buildSessionPlan(assignment, progress, seed);
  const session: SessionRecord = {
    id: `daily-${dayKey(now)}-${seed.slice(-8)}`,
    kind: "daily",
    startedAt: now.toISOString(),
    targetConceptIds: [...assignment.newConceptIds, ...assignment.reviewConceptIds],
    newConceptIds: assignment.newConceptIds,
    reviewConceptIds: assignment.reviewConceptIds,
    targetSources: assignment.targetSources ?? {},
    interactionCount: plan.interactions.length,
    correctCount: 0,
    retryCount: 0,
    seed,
    interactions: plan.interactions,
    currentInteractionIndex: 0,
    answerRetries: {},
    pendingRetries: [],
    mistakeConceptIds: [],
    stars: 0,
  };
  await repository.saveSession(session);
  return session;
}

export async function startPracticeSession(repository: ProgressRepository, kind: "practice" | "mistake-practice", now = new Date()): Promise<SessionRecord> {
  const sessions = await repository.getSessions();
  const existing = sessions.filter((session) => sessionKind(session) === kind && !session.completedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  if (existing) return existing;
  const attempts = await repository.getAttempts();
  const progress = await repository.getAllConceptProgress();
  const today = await getTodaySession(repository, now);
  const wrongConceptIds = [...attempts].reverse().filter((attempt) => !attempt.correct).map((attempt) => attempt.conceptId);
  const candidates = kind === "mistake-practice" ? wrongConceptIds : [...wrongConceptIds, ...(today?.targetConceptIds ?? []), ...progress.map((item) => item.conceptId)];
  const selected = [...new Set(candidates)].filter((id) => catalogById.get(id)?.enabledByDefault).slice(0, 15);
  if (!selected.length) selected.push(...wordConcepts.filter((concept) => concept.enabledByDefault).slice(0, 10).map((concept) => concept.id));
  const seed = `${kind}-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
  const targetSources = kind === "mistake-practice"
    ? Object.fromEntries(selected.map((id) => [id, "weak-word-review"] as const))
    : {};
  const plan = buildSessionPlan({ newConceptIds: [], reviewConceptIds: selected, targetSources }, progress, seed);
  const session: SessionRecord = { id: `${kind}-${now.getTime()}-${seed.slice(-6)}`, kind, startedAt: now.toISOString(), targetConceptIds: selected, newConceptIds: [], reviewConceptIds: selected, targetSources, interactionCount: plan.interactions.length, correctCount: 0, retryCount: 0, seed, interactions: plan.interactions, currentInteractionIndex: 0, answerRetries: {}, pendingRetries: [], mistakeConceptIds: [], stars: 0 };
  await repository.saveSession(session);
  return session;
}

export async function introduceConcept(repository: ProgressRepository, sessionId: string, conceptId: string, now = new Date()) {
  const session = await sessionById(repository, sessionId);
  if (!session || session.completedAt) return;
  const current = await repository.getConceptProgress(conceptId) ?? createProgress(conceptId);
  if (!current.introducedAt) {
    current.introducedAt = now.toISOString();
    current.sessionIds = [...current.sessionIds, sessionId];
    await repository.saveConceptProgress(current);
  }
}

function completedQuestions(session: SessionRecord) {
  return questionCountBefore(session.interactions ?? [], session.currentInteractionIndex ?? 0);
}

async function placeDueRetry(repository: ProgressRepository, session: SessionRecord) {
  const interactions = session.interactions ?? [];
  const index = session.currentInteractionIndex ?? 0;
  const totalQuestions = completedQuestions(session);
  const pending = [...(session.pendingRetries ?? [])].sort((a, b) => a.dueAfterQuestionCount - b.dueAfterQuestionCount);
  const due = pending.find((item) => totalQuestions >= item.dueAfterQuestionCount);
  if (!due) return session;
  const history = interactions.slice(0, index).filter((item): item is Question => !("kind" in item));
  const retry = createDelayedRetry(due.conceptId, 5, `${session.seed}:reinforcement-${due.reinforcementNumber ?? 1}`, history);
  if (!retry) return session;
  session.interactions = [...interactions.slice(0, index), retry, ...interactions.slice(index)];
  session.pendingRetries = pending.filter((item) => item !== due);
  session.retryCount += 1;
  session.interactionCount = session.interactions.length;
  await repository.saveSession(session);
  return session;
}

/** If a miss happens at the end, add neutral mixed review before retrying it.
 * This preserves the five-question retry gap instead of silently completing
 * a session with a retry that was never shown. */
async function appendRecoveryBuffer(repository: ProgressRepository, session: SessionRecord) {
  const pending = [...(session.pendingRetries ?? [])].sort((a, b) => a.dueAfterQuestionCount - b.dueAfterQuestionCount)[0]; const interactions = session.interactions ?? [];
  if (!pending || (session.currentInteractionIndex ?? 0) < interactions.length) return session;
  const total = completedQuestions(session); const needed = pending.dueAfterQuestionCount - total;
  if (needed <= 0) return session;
  const random = new SeededRandom(`${session.seed}:recovery:${total}`);
  const history = interactions.filter((item): item is Question => !("kind" in item)); const additions: Question[] = [];
  for (let count = 0; count < needed; count++) {
    const candidates = random.shuffle(session.targetConceptIds.filter((id) => id !== pending.conceptId)); let next: Question | undefined;
    for (const conceptId of candidates) {
      const previous = [...history, ...additions].reverse().find((item) => item.targetConceptId === conceptId);
      const types = availableTypes(conceptId).filter((type) => type !== previous?.type); if (!types.length) continue;
      const question = createQuestion(conceptId, random.pick(types), random, [], [...history, ...additions]);
      if (!canAppendQuestion([...history, ...additions], question)) continue;
      const desired = chooseBalancedAnswerIndex([...history, ...additions], question.options.length, Math.floor(random.next() * question.options.length));
      if (desired !== question.correctOptionIndex) [question.options[desired], question.options[question.correctOptionIndex]] = [question.options[question.correctOptionIndex]!, question.options[desired]!];
      question.correctOptionIndex = desired; next = question; break;
    }
    if (!next) break;
    additions.push(next);
  }
  if (additions.length) { session.interactions = [...interactions, ...additions]; session.interactionCount = session.interactions.length; await repository.saveSession(session); }
  return session;
}

async function moveForward(repository: ProgressRepository, session: SessionRecord, now: Date): Promise<AnswerResult> {
  session.currentInteractionIndex = (session.currentInteractionIndex ?? 0) + 1;
  await repository.saveSession(session);
  const withRetry = await placeDueRetry(repository, session);
  if ((withRetry.currentInteractionIndex ?? 0) < (withRetry.interactions?.length ?? 0)) return "correct";
  const buffered = await appendRecoveryBuffer(repository, withRetry);
  if ((buffered.currentInteractionIndex ?? 0) < (buffered.interactions?.length ?? 0)) return "correct";
  await completeSession(repository, buffered.id, now);
  return "finished";
}

/** Record every tap. A first miss stays on the same question; a second miss schedules a delayed retry. */
export async function answerQuestion(repository: ProgressRepository, sessionId: string, question: Question, selectedAnswer: string, responseMs: number, now = new Date()): Promise<AnswerResult> {
  const session = await sessionById(repository, sessionId);
  if (!session || session.completedAt) return "finished";
  const correct = selectedAnswer === question.targetConceptId;
  const prior = await repository.getConceptProgress(question.targetConceptId) ?? createProgress(question.targetConceptId);
  const withIntro = prior.introducedAt ? prior : { ...prior, introducedAt: now.toISOString(), sessionIds: [...prior.sessionIds, sessionId] };
  const updatedProgress = scheduleNextReview(applyMastery(withIntro, question.type, correct, question.visualAssetId), correct, now);
  if (!correct) updatedProgress.reviewPriority = "soon";
  await repository.saveConceptProgress(updatedProgress);
  const tapCount = (session.answerRetries?.[question.id] ?? 0) + 1;
  const event: AttemptEvent = {
    id: `${sessionId}-${question.id}-${tapCount}-${now.getTime()}`,
    sessionId,
    conceptId: question.targetConceptId,
    questionType: question.type,
    visualVariantId: question.visualAssetId,
    correct,
    selectedAnswer,
    expectedAnswer: question.targetConceptId,
    responseMs,
    createdAt: now.toISOString(),
    isRetry: question.isRetry,
    assignmentSource: session.targetSources?.[question.targetConceptId],
  };
  await repository.addAttempt(event);
  session.answerRetries = { ...(session.answerRetries ?? {}), [question.id]: tapCount };
  if (correct) {
    session.correctCount += 1;
    session.stars = (session.stars ?? 0) + 1;
    await repository.saveSession(session);
    return moveForward(repository, session, now);
  }
  if (!question.isRetry && !(session.mistakeConceptIds ?? []).includes(question.targetConceptId)) {
    const completed = completedQuestions(session);
    session.mistakeConceptIds = [...(session.mistakeConceptIds ?? []), question.targetConceptId];
    session.pendingRetries = [
      ...(session.pendingRetries ?? []),
      { conceptId: question.targetConceptId, dueAfterQuestionCount: completed + 6, reinforcementNumber: 1 },
      { conceptId: question.targetConceptId, dueAfterQuestionCount: completed + 13, reinforcementNumber: 2 },
    ];
  }
  if (tapCount === 1) {
    await repository.saveSession(session);
    return "try-again";
  }
  await repository.saveSession(session);
  const result = await moveForward(repository, session, now);
  return result === "finished" ? "finished" : "delayed-retry";
}

/** Completion is idempotent, so refreshes and double taps cannot add rewards twice. */
export async function completeSession(repository: ProgressRepository, sessionId: string, now = new Date()) {
  const session = await sessionById(repository, sessionId);
  if (!session || session.completedAt) return false;
  session.completedAt = now.toISOString();
  await repository.saveSession(session);
  await repository.addAnalytics({ id: `session-completed-${session.id}`, type: "session_completed", createdAt: now.toISOString(), payload: { sessionId: session.id, kind: sessionKind(session), stars: session.stars ?? 0, correctCount: session.correctCount, interactions: session.interactionCount } });
  return true;
}

export function currentInteraction(session: SessionRecord) {
  return session.interactions?.[session.currentInteractionIndex ?? 0];
}

export function conceptFor(id: string) {
  const concept = catalogById.get(id);
  if (!concept) throw new Error(`Unknown concept: ${id}`);
  return concept;
}
