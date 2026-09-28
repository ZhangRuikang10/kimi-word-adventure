import { conceptById } from "../content/words";
import type { ConceptProgress, DailyAssignment, Question, QuestionType, SessionInteraction } from "../types/learning";
import { canAppendQuestion, chooseBalancedAnswerIndex, RETRY_GAP_MIN } from "./antiPattern";
import { availableTypes, createQuestion } from "./questionFactory";
import { SeededRandom } from "./random";

export interface SessionPlan { seed: string; interactions: SessionInteraction[]; questions: Question[]; }
interface Pending { conceptId: string; occurrence: number; preferred: QuestionType[]; }

export function buildSessionPlan(assignment: DailyAssignment, progress: ConceptProgress[], seed: string, attempt = 0): SessionPlan {
  const random = new SeededRandom(seed); const progressById = new Map(progress.map((item) => [item.conceptId, item]));
  const pending: Pending[] = [
    ...assignment.newConceptIds.flatMap((conceptId) => {
      const types = availableTypes(conceptId);
      const first = { conceptId, occurrence: 1, preferred: ["WORD_TO_PICTURE", "AUDIO_TO_WORD"] as QuestionType[] };
      // Greetings have only Audio → Word support because their images are
      // intentionally low-discriminability; never force a duplicate type.
      return types.length > 1 ? [first, { conceptId, occurrence: 2, preferred: ["PICTURE_TO_WORD", "AUDIO_TO_PICTURE"] as QuestionType[] }] : [first];
    }),
    ...assignment.reviewConceptIds.map((conceptId) => ({ conceptId, occurrence: 1, preferred: ["WORD_TO_PICTURE", "AUDIO_TO_WORD", "PICTURE_TO_WORD"] as QuestionType[] })),
  ];
  const bridgeConcepts = [...assignment.newConceptIds, ...assignment.reviewConceptIds].filter((id) => {
    const item = progressById.get(id); return item && (item.mastery.phraseUnderstanding >= 40 || item.mastery.sentenceUnderstanding >= 40);
  }).slice(0, 6);
  pending.push(...bridgeConcepts.map((conceptId) => ({ conceptId, occurrence: 3, preferred: ["PHRASE_MATCH", "SENTENCE_MATCH"] as QuestionType[] })));
  const questions: Question[] = [];
  while (pending.length) {
    const shuffled = random.shuffle(pending);
    const reviewWarmup = questions.length < 4 ? shuffled.filter((item) => assignment.reviewConceptIds.includes(item.conceptId)) : [];
    const candidates = reviewWarmup.length ? reviewWarmup : shuffled; let placed = false;
    for (const candidate of candidates) {
      const priorForTarget = questions.filter((item) => item.targetConceptId === candidate.conceptId); const available = availableTypes(candidate.conceptId).filter((type) => !priorForTarget.some((item) => item.type === type)); const preferred = candidate.preferred.filter((type) => available.includes(type)); const possibleTypes = random.shuffle(preferred.length ? preferred : available);
      for (const type of possibleTypes) {
        const question = createQuestion(candidate.conceptId, type, random, priorForTarget.map((item) => item.visualAssetId).filter(Boolean) as string[], questions);
        if (!canAppendQuestion(questions, question)) continue;
        question.correctOptionIndex = balanceAndMoveCorrectOption(question, questions, random);
        questions.push(question); pending.splice(pending.indexOf(candidate), 1); placed = true; break;
      }
      if (placed) break;
    }
    if (!placed) { if (attempt < 20) return buildSessionPlan(assignment, progress, `${seed}:layout-${attempt + 1}`, attempt + 1); throw new Error("Unable to create a session that satisfies anti-pattern constraints for this assignment"); }
  }
  const introductions = new Map<number, string[]>();
  for (const conceptId of assignment.newConceptIds) {
    const firstQuestionIndex = questions.findIndex((question) => question.targetConceptId === conceptId);
    if (firstQuestionIndex < 0) continue;
    const introductionIndex = Math.max(0, firstQuestionIndex - 4);
    introductions.set(introductionIndex, [...(introductions.get(introductionIndex) ?? []), conceptId]);
  }
  const interactions: SessionInteraction[] = [];
  questions.forEach((question, index) => {
    for (const conceptId of introductions.get(index) ?? []) interactions.push({ kind: "learn", conceptId });
    interactions.push(question);
  });
  return { seed, interactions, questions };
}

function balanceAndMoveCorrectOption(question: Question, history: Question[], random: SeededRandom): number {
  const current = question.correctOptionIndex; const desired = chooseBalancedAnswerIndex(history, question.options.length, Math.floor(random.next() * question.options.length));
  if (desired !== current) [question.options[current], question.options[desired]] = [question.options[desired]!, question.options[current]!]; return desired;
}

/** Return a retry question only after five to eight subsequent questions have occurred. */
export function createDelayedRetry(conceptId: string, questionsSinceWrong: number, seed: string, history: Question[]): Question | undefined {
  if (questionsSinceWrong < RETRY_GAP_MIN || questionsSinceWrong > 8) return undefined;
  const random = new SeededRandom(`${seed}:retry:${conceptId}:${questionsSinceWrong}`); const previous = [...history].reverse().find((question) => question.targetConceptId === conceptId);
  const allTypes = availableTypes(conceptId); const alternatives = allTypes.filter((type) => type !== previous?.type);
  // Low-visual-discriminability greetings have one formal assessment mode.
  // Their delayed retry is still safe after five questions, even though a
  // different mode is unavailable.
  const types = alternatives.length ? alternatives : allTypes; if (!types.length) return undefined;
  const question = createQuestion(conceptId, random.pick(types), random, history.filter((item) => item.targetConceptId === conceptId).map((item) => item.visualAssetId).filter(Boolean) as string[], history, true);
  question.correctOptionIndex = balanceAndMoveCorrectOption(question, history, random); return canAppendQuestion(history, question) ? question : undefined;
}
