import type { VisualAsset } from "../types/learning";

export const wordAdventureCoreConceptIds = [
  "person-boy","person-girl","feeling-happy","feeling-sad","feeling-tired",
  "action-stand-up","action-sit-down","action-look","action-listen","action-point","action-touch","action-show-me","action-give","action-take","action-come-here","action-stop","action-go",
  "colour-red","colour-blue","colour-yellow","colour-green","colour-orange","colour-pink","colour-purple","colour-black","colour-white","colour-brown",
  "object-ball","object-table","object-chair","object-pencil","object-star","object-apple","object-bag","object-banana","object-orange-fruit","object-cookie","object-crayon","object-book","object-notebook","object-eraser","object-ruler","object-toy-car","object-teddy-bear","object-basket",
  "greeting-hello","greeting-hi","greeting-goodbye",
  "object-euro",
] as const;

const course = (id: string, src: string, conceptIds: string[]): VisualAsset => ({ id, src, conceptIds, role: "core", approved: true, source: "course-reuse" });
const lowVisualDiscriminabilityCoreIds = new Set(["greeting-hello","greeting-hi"]);
const wordCore = (conceptId: string): VisualAsset => ({ id: `wa-core-${conceptId}`, src: `/assets/word-core/${conceptId}.png`, conceptIds: [conceptId], role: "core", approved: true, source: "word-adventure-new", lowVisualDiscriminability: lowVisualDiscriminabilityCoreIds.has(conceptId) || undefined });
const variant = (id: string, conceptIds: string[], group: "actions" | "people" | "objects", avoidAsDistractorFor?: string[]): VisualAsset => ({ id, src: `/assets/word-variants/${group}/${id}.png`, conceptIds, role: "variant", approved: true, source: "word-adventure-new", avoidAsDistractorFor });

export const visualAssets: VisualAsset[] = [
  ...wordAdventureCoreConceptIds.map((conceptId) => wordCore(conceptId)),
  course("course-boy","/assets/course/images/lesson-1/characters/tom/tom-neutral.png",["person-boy"]),course("course-girl","/assets/course/images/lesson-1/characters/mia/mia-neutral.png",["person-girl"]),course("course-happy","/assets/course/images/lesson-1/characters/tom/tom-happy.png",["feeling-happy"]),course("course-sad","/assets/course/images/lesson-1/characters/mia/mia-sad.png",["feeling-sad"]),course("course-tired","/assets/course/images/lesson-1/characters/mia/mia-tired.png",["feeling-tired"]),
  ...[["stand-up","tom/tom-stand-up.png"],["sit-down","mia/mia-sit-down.png"],["look","tom/tom-look-at-ball.png"],["listen","mia/mia-listening.png"],["point","tom/tom-pointing-at-ball.png"],["touch","tom/tom-touching-ball.png"],["show-me","mia/mia-showing-ball.png"],["give","tom/tom-giving-ball-to-mia.png"],["take","mia/mia-taking-ball-from-tom.png"],["come-here","mia/mia-come-here.png"],["stop","tom/tom-stop.png"],["go","mia/mia-go.png"]].map(([key, path]) => course(`course-action-${key}`, `/assets/course/images/lesson-1/characters/${path}`, [`action-${key}`])),
  ...[["ball","lesson-1/objects/ball.png"],["table","lesson-1/objects/table.png"],["chair","lesson-1/objects/chair.png"],["pencil","lesson-2/objects/pencil-blue.png"],["star","lesson-2/objects/star-yellow.png"],["apple","lesson-2/objects/apple-red.png"],["bag","lesson-2/objects/bag-pink.png"],["banana","lesson-03/objects/banana.png"],["orange-fruit","lesson-03/objects/orange.png"],["cookie","lesson-03/objects/cookie.png"],["crayon","lesson-03/objects/crayon.png"],["book","lesson-03/objects/book-green.png"],["notebook","lesson-03/objects/notebook.png"],["eraser","lesson-03/objects/eraser.png"],["ruler","lesson-03/objects/ruler.png"],["toy-car","lesson-03/objects/toy-car.svg"],["teddy-bear","lesson-03/objects/teddy-bear.svg"],["basket","lesson-03/objects/basket.svg"]].map(([key, path]) => course(`course-object-${key}`, `/assets/course/images/${path}`, [`object-${key}`])),
  ...["red","blue","yellow","green","orange","pink","purple","black","white","brown"].map((colour) => course(`course-colour-${colour}`, `/assets/course/images/lesson-2/colours/colour-${colour}.svg`, [`colour-${colour}`])),
  ...Array.from({ length: 20 }, (_, index) => course(`course-number-${index + 1}`, `/assets/course/images/common/numeral-${index + 1}.svg`, [`number-${String(index + 1).padStart(2,"0")}`])),
  ...["stand-up","sit-down","look","listen","point","touch","show-me","give","take","come-here","stop","go"].flatMap((name) => [variant(`wa-action-${name}-01`,[`action-${name}`],"actions"), variant(`wa-action-${name}-02`,[`action-${name}`],"actions")]),
  variant("wa-boy-alt-01",["person-boy"],"people"),variant("wa-girl-alt-01",["person-girl"],"people"),...(["happy","sad","tired"] as const).flatMap((feeling)=>[variant(`wa-${feeling}-alt-01`,[`feeling-${feeling}`],"people"),variant(`wa-${feeling}-alt-02`,[`feeling-${feeling}`],"people")]),
  variant("wa-red-ball-01",["colour-red","object-ball"],"objects"), variant("wa-red-apple-01",["colour-red","object-apple"],"objects"),
  variant("wa-blue-pencil-01",["colour-blue","object-pencil"],"objects"), variant("wa-blue-eraser-01",["colour-blue","object-eraser"],"objects"), variant("wa-blue-eraser-02",["colour-blue","object-eraser"],"objects"),
  variant("wa-yellow-star-01",["colour-yellow","object-star"],"objects"), variant("wa-yellow-ruler-01",["colour-yellow","object-ruler"],"objects"),
  variant("wa-green-book-01",["colour-green","object-book"],"objects"), variant("wa-green-apple-01",["colour-green","object-apple"],"objects"),
  variant("wa-orange-toy-car-01",["colour-orange","object-toy-car"],"objects"), variant("wa-orange-book-01",["colour-orange","object-book"],"objects"),
  variant("wa-pink-bag-01",["colour-pink","object-bag"],"objects"), variant("wa-pink-crayon-01",["colour-pink","object-crayon"],"objects"), variant("wa-pink-eraser-01",["colour-pink","object-eraser"],"objects"),
  variant("wa-purple-star-01",["colour-purple","object-star"],"objects"), variant("wa-purple-notebook-01",["colour-purple","object-notebook"],"objects"),
  variant("wa-black-chair-01",["colour-black","object-chair"],"objects"), variant("wa-black-ruler-01",["colour-black","object-ruler"],"objects"),
  variant("wa-white-notebook-01",["colour-white","object-notebook"],"objects"), variant("wa-white-basket-01",["colour-white","object-basket"],"objects"),
  variant("wa-brown-table-01",["colour-brown","object-table"],"objects"), variant("wa-brown-teddy-bear-01",["colour-brown","object-teddy-bear"],"objects"),
  variant("wa-banana-hand-01",["object-banana"],"objects"), variant("wa-banana-table-01",["object-banana"],"objects"),
  variant("wa-orange-fruit-bowl-01",["object-orange-fruit"],"objects",["colour-orange"]), variant("wa-orange-fruit-hand-01",["object-orange-fruit"],"objects",["colour-orange"]),
  variant("wa-cookie-plate-01",["object-cookie"],"objects"), variant("wa-cookie-hand-01",["object-cookie"],"objects"),
];

export const approvedVisualsFor = (conceptId: string) => visualAssets.filter((asset) => asset.approved && asset.conceptIds.includes(conceptId));
