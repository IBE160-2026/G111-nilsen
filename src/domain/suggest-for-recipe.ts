import { normalizeSearch } from "./filter-collection";
import type { Suggestion } from "./types";

/** Det forslagene bygger på: tittel, ingredienser og steg. */
export type SuggestInput = {
  title: string;
  ingredients: readonly { name: string; original: string }[];
  steps: readonly { text: string }[];
};

type Context = { title: string; ingredients: string; steps: string; all: string };

/**
 * Hvordan et råd vises i oppskriften når det er tatt i bruk (Story 5.11): `line` er
 * ingredienslinjen (tolkes og skaleres som de andre), `before` stammer for steget det settes
 * foran («*» betyr først). Uten `before` legges steget sist.
 */
export type TipPlacement = { line?: string; before?: readonly string[] };

type Tip = Suggestion & TipPlacement & { skipWhen?: (c: Context) => boolean };
type Group = { matches: (c: Context) => boolean; tips: readonly Tip[] };

/** Ord som begynner med `stem` («kjøttdeig» treffer «kjøttdeig»), eller slutter med det når `compound`. */
function word(text: string, stem: string, compound = false): boolean {
  const pattern = compound ? `\\p{L}*${stem}(?![\\p{L}])` : `(?:^|[^\\p{L}])${stem}`;
  return new RegExp(pattern, "u").test(text);
}
const any = (text: string, stems: readonly string[], compound = false) =>
  stems.some((stem) => word(text, stem, compound));

const hasStep = (c: Context, stems: readonly string[]) => any(c.steps, stems);

/**
 * Enkle forslag uten språkmodell: grupper etter hva slags rett det er, med råd som passer det
 * oppskriften faktisk inneholder. Rekkefølgen er prioriteten. `skipWhen` hopper over et råd
 * oppskriften allerede følger. Hver gruppe har egne råd om ingredienser, steg og servering.
 */
const GROUPS: readonly Group[] = [
  {
    matches: (c) => any(c.all, ["kjøttdeig", "kjøttbolle", "karbonade", "burger", "farse"], false),
    tips: [
      {
        text: "Rør inn en revet gulrot eller finhakket løk i kjøttdeigen.",
        reason: "Grønnsakene gir fuktighet, så kjøttet blir saftigere og smaker mer.",
        appliesTo: "ingredients",
        line: "1 revet gulrot eller finhakket løk",
        skipWhen: (c) => any(c.ingredients, ["gulrot", "løk"]),
      },
      {
        text: "La deigen hvile kaldt i 15–20 minutter før du former og steker den.",
        reason: "Deigen setter seg, og formene holder seg bedre i pannen.",
        appliesTo: "steps",
        before: ["form", "stek"],
        skipWhen: (c) => hasStep(c, ["hvile", "hviler"]),
      },
      {
        text: "Server med kokte poteter og en enkel råkost eller agurksalat.",
        reason: "Frisk og sprø kontrast til en mør og saftig rett.",
        appliesTo: "recipe",
      },
    ],
  },
  {
    matches: (c) =>
      (any(c.all, ["gjær"], false) || any(c.title, ["rundstykke", "brød", "bolle", "focaccia"])) &&
      any(c.ingredients, ["mel"], true),
    tips: [
      {
        text: "Pensle med sammenvispet egg eller melk og strø over frø før steking.",
        reason: "Gir blank, gyllen skorpe og litt ekstra smak og knas.",
        appliesTo: "steps",
        before: ["stek"],
        skipWhen: (c) => hasStep(c, ["pensl"]) || any(c.ingredients, ["pensling"]),
      },
      {
        text: "Bytt ut en fjerdedel av hvetemelet med grovt mel eller sammalt mel.",
        reason: "Gir mer smak og fiber uten at deigen blir for tung.",
        appliesTo: "ingredients",
        line: "Bytt ¼ av hvetemelet med grovt eller sammalt mel",
        skipWhen: (c) => any(c.ingredients, ["sammalt", "grov", "rug", "spelt"]),
      },
      {
        text: "Sett en liten form med varmt vann nederst i ovnen mens du steker.",
        reason: "Dampen gir sprø skorpe og luftig innside.",
        appliesTo: "steps",
        before: ["stek"],
        skipWhen: (c) => hasStep(c, ["damp"]),
      },
    ],
  },
  {
    matches: (c) =>
      any(c.title, ["pannekake", "lapp", "vaffel", "crêpe", "crepe"]) ||
      (any(c.ingredients, ["egg"]) &&
        any(c.ingredients, ["melk"], true) &&
        any(c.ingredients, ["mel"], true) &&
        !any(c.all, ["gjær", "bakepulver"]) &&
        hasStep(c, ["stek", "steking"])),
    tips: [
      {
        text: "La røren hvile i 20–30 minutter før du begynner å steke.",
        reason: "Melet sveller, så pannekakene blir mykere og holder seg bedre sammen.",
        appliesTo: "steps",
        before: ["stek"],
        skipWhen: (c) => hasStep(c, ["hvile", "hviler"]),
      },
      {
        text: "Ha en teskje vaniljesukker eller kardemomme i røren.",
        reason: "Gir ekstra duft og smak uten å endre konsistensen.",
        appliesTo: "ingredients",
        line: "1 ts vaniljesukker eller kardemomme",
        skipWhen: (c) => any(c.ingredients, ["vanilje", "kardemomme", "kanel"]),
      },
      {
        text: "Server med friske bær og rømme, eller med syltetøy og litt sukker.",
        reason: "Syrlige bær balanserer det milde og søte.",
        appliesTo: "recipe",
      },
    ],
  },
  {
    matches: (c) =>
      !any(c.title, ["pannekake", "lapp", "vaffel"]) &&
      (any(c.title, ["kake", "muffins", "brownie", "sjokolade"], true) ||
        (any(c.ingredients, ["bakepulver", "natron"]) && any(c.ingredients, ["sukker"], true))),
    tips: [
      {
        text: "Forvarm ovnen helt før kaken settes inn, og unngå å åpne døren de første 20 minuttene.",
        reason: "Jevn varme gjør at kaken hever pent og ikke faller sammen.",
        appliesTo: "steps",
        before: ["*"],
      },
      {
        text: "Stikk en tørr pinne i midten: kommer den ut uten våt røre, er kaken ferdig.",
        reason: "Steketiden varierer mellom ovner, så pinnen er sikrere enn klokken.",
        appliesTo: "steps",
      },
      {
        text: "Ha en liten klype salt i røren.",
        reason: "Salt fremhever det søte og gir mer smak.",
        appliesTo: "ingredients",
        line: "1 klype salt",
        skipWhen: (c) => any(c.ingredients, ["salt"], true),
      },
    ],
  },
  {
    matches: (c) =>
      any(c.all, ["pasta", "spaghetti", "penne", "tagliatelle", "makaroni", "fusilli"]),
    tips: [
      {
        text: "Ta vare på en kopp av kokevannet og rør litt av det inn i sausen.",
        reason: "Stivelsen i vannet gjør sausen glatt og får den til å feste seg til pastaen.",
        appliesTo: "steps",
        skipWhen: (c) => hasStep(c, ["kokevann", "pastavann"]),
      },
      {
        text: "Riv parmesan eller pecorino over rett før servering.",
        reason: "Salt og kraftig smak som runder av sausen.",
        appliesTo: "recipe",
        skipWhen: (c) => any(c.ingredients, ["parmesan", "pecorino"]),
      },
    ],
  },
  {
    matches: (c) => any(c.ingredients, ["tomat"]) && !any(c.title, ["salat"]),
    tips: [
      {
        text: "Rør inn en klype sukker eller en skvett balsamico i tomatsausen.",
        reason: "Det demper syren fra tomatene og runder av smaken.",
        appliesTo: "ingredients",
        line: "1 klype sukker eller en skvett balsamico",
        skipWhen: (c) => any(c.ingredients, ["sukker", "balsamico", "honning"], true),
      },
      {
        text: "Tilsett frisk basilikum eller oregano helt til slutt.",
        reason: "Friske urter mister duften hvis de koker for lenge.",
        appliesTo: "steps",
        skipWhen: (c) => any(c.ingredients, ["basilikum", "oregano"]),
      },
    ],
  },
  {
    matches: (c) => any(c.ingredients, ["ris", "basmati", "jasmin"], true),
    tips: [
      {
        text: "Skyll risen til vannet er klart, og la den dampe under lokk i 10 minutter etter koking.",
        reason: "Fjerner overflødig stivelse, så risen blir løs og luftig.",
        appliesTo: "steps",
        before: ["ris", "kok"],
        skipWhen: (c) => hasStep(c, ["skyll"]),
      },
    ],
  },
  {
    matches: (c) => any(c.all, ["laks", "torsk", "ørret", "sei", "fisk", "reke", "kveite"]),
    tips: [
      {
        text: "Ta ikke fisken av varmen for sent: den er ferdig når den akkurat flaker seg.",
        reason: "Fisk som koker for lenge blir tørr og tung.",
        appliesTo: "steps",
      },
      {
        text: "Press litt sitron over og strø på frisk dill eller persille.",
        reason: "Syre og friske urter løfter smaken av fisk.",
        appliesTo: "ingredients",
        line: "Sitron, dill eller persille",
        skipWhen: (c) => any(c.ingredients, ["sitron", "dill", "persille"]),
      },
      {
        text: "Server med kokte poteter og en frisk agurksalat.",
        reason: "Mild og frisk følge som lar fisken stå i sentrum.",
        appliesTo: "recipe",
      },
    ],
  },
  {
    matches: (c) => any(c.all, ["kylling", "kyllingfilet", "kyllinglår"]),
    tips: [
      {
        text: "La kyllingen hvile 5–10 minutter før du skjærer i den, og sjekk at den er 75 °C inni.",
        reason: "Safta fordeler seg, så kjøttet blir saftigere, og kjernetemperaturen er trygg.",
        appliesTo: "steps",
        skipWhen: (c) => hasStep(c, ["hvile"]),
      },
      {
        text: "Mariner kyllingen i olje, sitron og hvitløk et par timer før steking.",
        reason: "Syre og olje gir smak og holder kjøttet mørt.",
        appliesTo: "ingredients",
        line: "Olje, sitron og hvitløk til marinade",
        skipWhen: (c) => any(c.all, ["marin"]),
      },
    ],
  },
  {
    matches: (c) => any(c.all, ["suppe", "gryte", "lapskaus", "buljong", "stuing", "chili"]),
    tips: [
      {
        text: "Smak til med en skvett sitron eller eddik helt til slutt.",
        reason: "Syre løfter smakene i varme retter som har fått koke lenge.",
        appliesTo: "steps",
      },
      {
        text: "Lag dobbel porsjon og frys ned halvparten.",
        reason: "Suppe og gryter smaker ofte best dagen etter og er fine å ha i fryseren.",
        appliesTo: "recipe",
      },
      {
        text: "Rør inn hakket persille eller dill rett før servering.",
        reason: "Friske urter gir friskhet til en lang og dyp smak.",
        appliesTo: "ingredients",
        line: "Hakket persille eller dill",
        skipWhen: (c) => any(c.ingredients, ["persille", "dill", "gressløk"]),
      },
    ],
  },
  {
    matches: (c) => any(c.all, ["omelett", "eggerøre", "eggerøra"]),
    tips: [
      {
        text: "Ta pannen av varmen når eggene nesten har stivnet.",
        reason: "De tilberedes videre av restvarmen og blir kremete i stedet for tørre.",
        appliesTo: "steps",
      },
    ],
  },
  {
    matches: (c) => any(c.ingredients, ["kikerter", "bønner", "linser"]),
    tips: [
      {
        text: "Skyll hermetiske bønner eller kikerter godt før de brukes.",
        reason: "Fjerner overskuddssalt og væsken som gir litt metallisk smak.",
        appliesTo: "steps",
        before: ["*"],
        skipWhen: (c) => hasStep(c, ["skyll"]),
      },
    ],
  },
  {
    matches: (c) => any(c.ingredients, ["løk"]),
    tips: [
      {
        text: "Fres løken på middels varme til den er blank og myk før du tilsetter resten.",
        reason: "Løken blir søt og mild i stedet for skarp.",
        appliesTo: "steps",
        before: ["løk"],
        skipWhen: (c) => hasStep(c, ["fres"]),
      },
    ],
  },
  {
    matches: (c) => any(c.ingredients, ["potet"]) && !any(c.ingredients, ["potetmel"]),
    tips: [
      {
        text: "Kok potetene i lettsaltet vann, og la dem dampe tørre et minutt i den varme kjelen.",
        reason: "Tørre poteter blir luftigere og tar bedre imot smør og saus.",
        appliesTo: "steps",
        before: ["potet"],
      },
    ],
  },
];

const MAX_SUGGESTIONS = 3;

/**
 * 0–3 forslag som passer rettens ingredienser og steg (Story 5.10), uten språkmodell. Rene regler,
 * så samme oppskrift gir samme forslag. Første gruppe som passer gir opptil to forslag, de neste ett
 * hver. Gir en tom liste når ingen gruppe passer, og kaster aldri.
 */
export function suggestForRecipe(recipe: SuggestInput): Suggestion[] {
  const title = normalizeSearch(recipe.title);
  const ingredients = normalizeSearch(
    recipe.ingredients.map((line) => `${line.name} ${line.original}`).join(" "),
  );
  const steps = normalizeSearch(recipe.steps.map((step) => step.text).join(" "));
  const context: Context = { title, ingredients, steps, all: `${title} ${ingredients}` };

  const picked: Suggestion[] = [];
  const seen = new Set<string>();
  let first = true;
  for (const group of GROUPS) {
    if (picked.length >= MAX_SUGGESTIONS) break;
    if (!group.matches(context)) continue;
    const tips = group.tips.filter((tip) => !tip.skipWhen?.(context) && !seen.has(tip.text));
    const take = first ? 2 : 1;
    for (const tip of tips.slice(0, take)) {
      if (picked.length >= MAX_SUGGESTIONS) break;
      picked.push({ text: tip.text, reason: tip.reason, appliesTo: tip.appliesTo });
      seen.add(tip.text);
    }
    if (tips.length > 0) first = false;
  }
  // Har bare én gruppe passet, fylles det opp fra den (tre er best, men ett er nok).
  if (picked.length < MAX_SUGGESTIONS) {
    for (const group of GROUPS) {
      if (picked.length >= MAX_SUGGESTIONS) break;
      if (!group.matches(context)) continue;
      for (const tip of group.tips) {
        if (picked.length >= MAX_SUGGESTIONS) break;
        if (tip.skipWhen?.(context) || seen.has(tip.text)) continue;
        picked.push({ text: tip.text, reason: tip.reason, appliesTo: tip.appliesTo });
        seen.add(tip.text);
      }
    }
  }
  return picked;
}

const PLACEMENTS: ReadonlyMap<string, TipPlacement> = new Map(
  GROUPS.flatMap((group) => group.tips).map((tip) => [
    tip.text,
    { line: tip.line, before: tip.before },
  ]),
);

/** Hvordan et råd fra reglene vises i oppskriften, eller `undefined` for andre forslag (språkmodell). */
export function tipPlacement(text: string): TipPlacement | undefined {
  return PLACEMENTS.get(text);
}
