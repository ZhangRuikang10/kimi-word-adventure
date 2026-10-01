export type CurriculumStatus = "core" | "exposure" | "bonus";
export type ConceptKind = "word" | "chunk" | "multiword-noun";
export type LearningStatus = "new" | "learning" | "good" | "mastered";
export type QuestionType = "WORD_TO_PICTURE" | "AUDIO_TO_PICTURE" | "PICTURE_TO_WORD" | "AUDIO_TO_WORD" | "PHRASE_MATCH" | "SENTENCE_MATCH";
export type VisualRole = "core" | "variant" | "scene";
export type ReviewSource = "new" | "scheduled-review" | "weak-word-review" | "bootstrap-review";
export type ReviewPriority = "normal" | "soon";
export type SessionKind = "daily" | "practice" | "mistake-practice";

export interface QuestionCapabilities { wordToPicture: boolean; audioToPicture: boolean; pictureToWord: boolean; audioToWord: boolean; phrase: boolean; sentence: boolean; }
export interface WordConcept {
  id: string; display: string; meaningKey: string; category: string; kind: ConceptKind;
  sourceLessons: number[]; curriculumStatus: CurriculumStatus; enabledByDefault: boolean;
  forms?: { singular?: string; plural?: string };
  audio: { word?: string; phraseIds: string[]; sentenceIds: string[] };
  visuals: { core: string[]; variants: string[]; scenes: string[] };
  capabilities: QuestionCapabilities; distractorPool: string[]; phraseIds: string[]; sentenceIds: string[];
}
export interface PhraseEntry { id: string; text: string; conceptIds: string[]; audio?: string; approved: boolean; }
export interface SentenceEntry { id: string; text: string; conceptIds: string[]; audio?: string; approved: boolean; }
export interface VisualAsset { id: string; src: string; conceptIds: string[]; role: VisualRole; approved: boolean; source: "course-reuse" | "word-adventure-new"; avoidAsDistractorFor?: string[]; lowVisualDiscriminability?: boolean; }
export type AudioLevel = "word" | "phrase" | "sentence";
export type AudioSource = "reused" | "newly-generated";
export type AudioApprovalStatus = "approved" | "pending-human-QA";
export interface AudioAsset {
  id: string; level: AudioLevel; text: string; spokenText?: string; src: string;
  conceptId?: string; phraseId?: string; sentenceId?: string;
  provider: "Google Cloud Text-to-Speech / Gemini TTS"; model: "gemini-2.5-flash-tts"; voice: "Kore"; locale: "en-GB";
  approved: boolean; approvalStatus: AudioApprovalStatus; source: AudioSource;
}
export interface SkillMastery { pictureMeaning: number; listeningMeaning: number; wordReading: number; phraseUnderstanding: number; sentenceUnderstanding: number; visualTransfer: number; }
export interface ConceptProgress {
  conceptId: string; status: LearningStatus; introducedAt?: string; lastReviewedAt?: string; nextReviewAt?: string; intervalStage: number;
  mastery: SkillMastery; totalAttempts: number; correctAttempts: number; currentStreak: number; recentVariantIds: string[]; seenQuestionTypes: QuestionType[]; sessionIds: string[];
  /** Teacher-owned controls. Undefined preserves the catalog's safe defaults. */
  teacherIntroduced?: boolean; schedulerEnabled?: boolean; reviewPriority?: ReviewPriority;
}
export interface AttemptEvent { id: string; sessionId: string; conceptId: string; questionType: QuestionType; visualVariantId?: string; correct: boolean; selectedAnswer?: string; expectedAnswer: string; responseMs: number; createdAt: string; isRetry?: boolean; assignmentSource?: ReviewSource; }
export interface PendingRetry { conceptId: string; dueAfterQuestionCount: number; reinforcementNumber?: 1 | 2; }
export interface SessionRecord {
  id: string; startedAt: string; completedAt?: string; targetConceptIds: string[]; newConceptIds: string[]; reviewConceptIds: string[];
  kind?: SessionKind;
  targetSources?: Record<string, ReviewSource>;
  interactionCount: number; correctCount: number; retryCount: number; seed: string;
  /** Persisted interaction state lets an in-progress daily adventure resume after refresh. */
  interactions?: SessionInteraction[]; currentInteractionIndex?: number; answerRetries?: Record<string, number>; pendingRetries?: PendingRetry[]; mistakeConceptIds?: string[]; stars?: number;
  /** Saved answer feedback prevents a refresh from skipping or hiding a result. */
  questionStates?: Record<string, QuestionAnswerState>;
}
export type QuestionAnswerState = {
  wrongOptionIds: string[];
  result: "open" | "correct" | "revealed";
};
export interface AnalyticsEvent { id: string; type: "session_completed" | "teacher_control" | "backup_imported"; createdAt: string; payload: Record<string, unknown>; }
export interface Question { id: string; targetConceptId: string; type: QuestionType; category: string; options: string[]; correctOptionIndex: number; visualAssetId?: string; optionVisualAssetIds?: Record<string, string>; isRetry?: boolean; }
export interface LearnCard { kind: "learn"; conceptId: string; }
export type SessionInteraction = LearnCard | Question;
export interface DailyAssignment { newConceptIds: string[]; reviewConceptIds: string[]; targetSources?: Record<string, ReviewSource>; }
export interface BackupPayload { schemaVersion: number; exportedAt: string; progresses: ConceptProgress[]; attempts: AttemptEvent[]; sessions: SessionRecord[]; analytics: AnalyticsEvent[]; }
