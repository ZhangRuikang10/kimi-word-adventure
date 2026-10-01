import type { QuestionType } from "../types/learning";

export type PromptAudio = { text: string; src: string };
const promptAudio: Record<"find-picture" | "listen-picture" | "picture-word" | "listen-word" | "listen-answer", PromptAudio> = {
  "find-picture": { text: "Find the picture.", src: "/assets/audio/prompts/find-the-picture.mp3" },
  "listen-picture": { text: "Listen. Find the picture.", src: "/assets/audio/prompts/listen-find-the-picture.mp3" },
  "picture-word": { text: "What is this?", src: "/assets/audio/prompts/what-is-this.mp3" },
  "listen-word": { text: "Listen. Choose the word.", src: "/assets/audio/prompts/listen-choose-the-word.mp3" },
  "listen-answer": { text: "Listen and choose the answer.", src: "/assets/audio/prompts/listen-and-choose.mp3" },
};
export const questionPromptAudios = Object.values(promptAudio);

export function questionPromptAudioFor(type: QuestionType): PromptAudio {
  if (type === "WORD_TO_PICTURE") return promptAudio["find-picture"];
  if (type === "AUDIO_TO_PICTURE") return promptAudio["listen-picture"];
  if (type === "PICTURE_TO_WORD") return promptAudio["picture-word"];
  if (type === "AUDIO_TO_WORD") return promptAudio["listen-word"];
  return promptAudio["listen-answer"];
}
