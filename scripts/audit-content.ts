import { phrases, sentences, wordConcepts } from "../src/content/catalog.ts";
import { visualAssets } from "../src/content/visualManifest.ts";
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
assert(wordConcepts.length===69,`Expected 69 concepts; found ${wordConcepts.length}`); assert(new Set(wordConcepts.map((item)=>item.id)).size===69,"Concept IDs must be unique");
assert(wordConcepts.filter((item)=>item.enabledByDefault).length===56,"Expected 56 default-enabled concepts"); assert(wordConcepts.filter((item)=>!item.enabledByDefault && item.category==="numbers").length===13,"Expected 13 teacher-gated numbers");
assert(wordConcepts.filter((item)=>item.display==="orange").map((item)=>item.id).sort().join(",")==="colour-orange,object-orange-fruit","Orange senses are invalid");
const ids=new Set(wordConcepts.map((item)=>item.id)); for(const entry of [...phrases,...sentences]) for(const id of entry.conceptIds) assert(ids.has(id),`Broken concept reference ${id} in ${entry.id}`);
const plannedCore=visualAssets.filter((item)=>item.source==="word-adventure-new"&&item.role==="core").length;
const plannedVariants=visualAssets.filter((item)=>item.source==="word-adventure-new"&&item.role==="variant").length;
assert(phrases.length===30,`Expected 30 phrases; found ${phrases.length}`); assert(sentences.length===27,`Expected 27 sentences; found ${sentences.length}`); assert(plannedCore===49,`Expected 49 planned core images; found ${plannedCore}`); assert(plannedVariants===60,`Expected 60 planned variant visual assets; found ${plannedVariants}`);
console.log(JSON.stringify({ concepts:wordConcepts.length, defaultEnabled:56, teacherGatedNumbers:13, phrases:phrases.length, sentences:sentences.length, plannedCoreImages:plannedCore, plannedVisualVariants:plannedVariants },null,2));
