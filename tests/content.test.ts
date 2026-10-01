import { describe, expect, it } from "vitest";
import { phrases, sentences, wordConcepts } from "../src/content/catalog";
import { visualAssets, wordAdventureCoreConceptIds } from "../src/content/visualManifest";
import { audioAssets } from "../src/content/audioManifest";
import { questionPromptAudios } from "../src/content/questionPromptAudio";

describe("content catalog", () => {
  it("keeps the 69-concept baseline and curriculum gating", () => {
    expect(wordConcepts).toHaveLength(69);
    expect(wordConcepts.filter((item) => item.enabledByDefault)).toHaveLength(56);
    expect(wordConcepts.filter((item) => item.category === "numbers" && !item.enabledByDefault)).toHaveLength(13);
    expect(wordConcepts.filter((item) => item.display === "orange").map((item) => item.id).sort()).toEqual(["colour-orange", "object-orange-fruit"]);
  });
  it("keeps language references valid and image approvals frozen", () => {
    const ids = new Set(wordConcepts.map((item) => item.id));
    [...phrases, ...sentences].forEach((entry) => entry.conceptIds.forEach((id) => expect(ids.has(id)).toBe(true)));
    expect(phrases).toHaveLength(30); expect(sentences).toHaveLength(27);
    expect(visualAssets.filter((item) => item.source === "word-adventure-new" && item.role === "variant")).toHaveLength(60);
    const core = visualAssets.filter((item) => item.source === "word-adventure-new" && item.role === "core");
    expect(wordAdventureCoreConceptIds).toHaveLength(49); expect(core).toHaveLength(49); expect(core.every((item) => item.approved)).toBe(true);
  });
  it("freezes complete Phase B formal audio after human approval", () => {
    expect(audioAssets).toHaveLength(126);
    expect(audioAssets.filter((item) => item.level === "word")).toHaveLength(69);
    expect(audioAssets.filter((item) => item.level === "phrase")).toHaveLength(30);
    expect(audioAssets.filter((item) => item.level === "sentence")).toHaveLength(27);
    expect(audioAssets.every((item) => item.src.startsWith("/assets/audio/") && item.approved && item.approvalStatus === "approved")).toBe(true);
    expect(audioAssets.filter((item) => item.source === "reused")).toHaveLength(59);
    expect(audioAssets.filter((item) => item.source === "newly-generated" && item.approved)).toHaveLength(67);
  });
  it("ships local prompt audio so every question can be read aloud consistently", () => {
    expect(questionPromptAudios).toHaveLength(5);
    expect(questionPromptAudios.every((asset) => asset.src.startsWith("/assets/audio/prompts/"))).toBe(true);
  });
});
