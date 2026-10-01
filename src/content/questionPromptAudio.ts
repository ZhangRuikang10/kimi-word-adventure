import type { QuestionType } from "../types/learning";

export type PromptAudio = { text: string; src: string };

/**
 * These are the only prompts spoken for picture-to-word questions. Every
 * other question type speaks its learning content directly, so the answer is
 * never preceded by a second, unrelated instruction recording.
 */
const pictureQuestionPrompts: Record<string, PromptAudio> = {
  colours: { text: "What colour is it?", src: "/assets/audio/prompts/what-colour-is-it.mp3" },
  "classroom-actions": { text: "What is the action?", src: "/assets/audio/prompts/what-is-the-action.mp3" },
  feelings: { text: "How do they feel?", src: "/assets/audio/prompts/how-do-they-feel.mp3" },
  people: { text: "Who is this?", src: "/assets/audio/prompts/who-is-this.mp3" },
  greetings: { text: "Which greeting is it?", src: "/assets/audio/prompts/which-greeting-is-it.mp3" },
  objects: { text: "What is this?", src: "/assets/audio/prompts/what-is-this.mp3" },
  numbers: { text: "How many?", src: "/assets/audio/prompts/how-many.mp3" },
};

export const questionPromptAudios = Object.values(pictureQuestionPrompts);

export function pictureQuestionPromptFor(category: string): PromptAudio {
  return pictureQuestionPrompts[category] ?? pictureQuestionPrompts.objects;
}

/** One question, one automatic recording: prompt for a picture question, or content otherwise. */
export function spokenAudioForQuestion(type: QuestionType, category: string, contentAudio?: Pick<PromptAudio, "src">): Pick<PromptAudio, "src"> | undefined {
  return type === "PICTURE_TO_WORD" ? pictureQuestionPromptFor(category) : contentAudio;
}
