import { cleanLines, cleanText } from "./clean-text";
import { importOk, noRecipe } from "./import-types";
import type { ImportedRecipe, ImportResult, RecipeNode } from "./import-types";

// Grenser for porsjonsantall. Speiler `LIMITS.servingsMin` og `LIMITS.servingsMax` i
// `src/lib/recipe-input.ts` (domenet kan ikke importere derfra, AD-1); en test låser at de er like.
const SERVINGS_MIN = 1;
const SERVINGS_MAX = 50;

// Hvor dypt vi følger lister og objekter i uventede strukturer. Reelle sider bruker 1–3 nivåer.
const MAX_STEP_DEPTH = 6; // steg, lister og seksjoner i `recipeInstructions`
const MAX_NAME_DEPTH = 3; // kildenavn i `publisher` og `author`
const MAX_YIELD_DEPTH = 3; // kandidater i `recipeYield`

type Step = ImportedRecipe["steps"][number];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Gjør et `Recipe`-objekt (fra `extractRecipeJsonLd`) om til én fast form. Kaster aldri:
 * felt med feil type gir tom verdi eller `null`. Mengder tolkes ikke her (det gjør `parseLine`).
 * En oppskrift uten tittel, eller uten både ingredienser og steg, gir `no_recipe`.
 */
export function normalizeRecipe(node: RecipeNode): ImportResult<ImportedRecipe> {
  try {
    if (!isObject(node)) return noRecipe();

    const title = firstText(node.name);
    if (title === "") return noRecipe("missing_title");

    const ingredients = readIngredients(node.recipeIngredient);
    const steps = readSteps(node.recipeInstructions);
    if (ingredients.length === 0 && steps.length === 0) return noRecipe("empty_recipe");

    return importOk({
      title,
      sourceName: readName(node.publisher, 0) ?? readName(node.author, 0),
      servings: readServings(node.recipeYield),
      ingredients: ingredients.map((text) => ({ text })),
      steps,
    });
  } catch {
    // Sikkerhetsnett (for eksempel stackoverflow i dype strukturer).
    return noRecipe();
  }
}

/** Første ikke-tomme rensede streng: en streng, eller første i en liste. */
function firstText(value: unknown): string {
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = cleanText(item);
      if (text !== "") return text;
    }
    return "";
  }
  return cleanText(value);
}

/** Navn fra en streng, et objekt med `name`, eller en liste av slike. `null` hvis ingen finnes. */
function readName(value: unknown, depth: number): string | null {
  if (depth > MAX_NAME_DEPTH) return null;
  if (typeof value === "string") return usableName(cleanText(value));
  if (Array.isArray(value)) {
    for (const item of value) {
      const name = readName(item, depth + 1);
      if (name) return name;
    }
    return null;
  }
  return isObject(value) && typeof value.name === "string"
    ? usableName(cleanText(value.name))
    : null;
}

/**
 * Et kildenavn skal være et navn, ikke en adresse: tomme navn og tekst som ser ut som en URL
 * («https://…», eller uten mellomrom med både punktum og skråstrek) gir `null`, slik at neste
 * kandidat (for eksempel `author`) prøves.
 */
function usableName(name: string): string | null {
  if (name === "" || /^https?:\/\//i.test(name)) return null;
  if (!/\s/.test(name) && name.includes(".") && name.includes("/")) return null;
  return name;
}

// ---------------------------------------------------------------------------
// Porsjonsantall
// ---------------------------------------------------------------------------

/**
 * Første tolkbare element i `recipeYield` avgjør. «Ikke gjett»: bare et tydelig heltall brukes.
 * Et element uten tydelig heltall (ingen tall, desimaltall, vitenskapelig skrivemåte, negativt
 * tall) hoppes over; et tydelig heltall utenfor grensene gir `null`. Se `integerIn` for hvilke
 * tall i en tekst som ikke regnes som porsjonsantall.
 */
function readServings(value: unknown): number | null {
  for (const candidate of yieldCandidates(value, 0)) {
    const parsed = integerIn(candidate);
    if (parsed === undefined) continue;
    return parsed >= SERVINGS_MIN && parsed <= SERVINGS_MAX ? parsed : null;
  }
  return null;
}

function yieldCandidates(value: unknown, depth: number): (string | number)[] {
  if (depth > MAX_YIELD_DEPTH) return [];
  if (typeof value === "string" || typeof value === "number") return [value];
  if (Array.isArray(value)) return value.flatMap((item) => yieldCandidates(item, depth + 1));
  if (isObject(value)) {
    return [...yieldCandidates(value.value, depth + 1), ...yieldCandidates(value.name, depth + 1)];
  }
  return [];
}

// Hvor mange tegn før og etter et tall som leses for å avgjøre om det er et porsjonsantall.
const CONTEXT_BEFORE = 8;
const CONTEXT_AFTER = 40;

// Tall, med valgfri desimaldel og valgfri eksponent («1e3»).
const NUMBER_TOKEN = /\d+(?:[.,]\d+)?(?:[eE][+-]?\d+)?/g;
// Måleenheter og mål som et tall foran ikke er et porsjonsantall for («3 dl», «20 cm», «180 °C»).
const UNIT = "(?:kg|gram|g|dl|cl|ml|liter|litre|l|cm|mm|°\\s*[cf]?|grader)(?![\\p{L}\\p{N}])";
const UNIT_AFTER = new RegExp(`^\\s*${UNIT}`, "iu");
// «4-6 dl»: området avgjøres av enheten bak det siste tallet. Gruppe 1 er halen etter første tall.
const RANGE_UNIT_AFTER = new RegExp(
  `^(\\s*[-\\u2013\\u2212]\\s*\\d+(?:[.,]\\d+)?)\\s*${UNIT}`,
  "iu",
);
// Brøk og blandet tall bak tallet: «1/2», «1 ½», «1½», «1 1/2».
const FRACTION_AFTER = /^(?:\s*\/\s*\d|\s*[¼-¾⅐-⅞]|\s+\d+\s*\/\s*\d)/;
// Nevneren i en brøk: «1/2».
const FRACTION_BEFORE = /\d\s*\/\s*$/;
// «2 x 6», «20x20», «2 × 3»: mål eller antall ganger, ikke porsjoner.
const TIMES_AFTER = /^\s*[x\u00d7]\s*\d/i;
const TIMES_BEFORE = /\d\s*[x\u00d7]\s*$/i;

/**
 * Første tydelige heltall i elementet, eller `undefined` når elementet ikke har et. «Ikke gjett»:
 * disse tallene hoppes over, og letingen fortsetter med neste tall i samme tekst («1 liter,
 * 4 porsjoner» gir 4):
 * - tall som følges av en måleenhet («3 dl», «20 cm», «180 °C», også området «2-3 dl»),
 * - tall på en av sidene av «x»/«×» («2 x 6», «20x20 cm»),
 * - tall som er del av en brøk eller et blandet tall («1/2», «1 1/2», «1 ½», «4 ½», «1½»).
 * Disse gir `undefined` for hele elementet: desimaltall («4.5»), vitenskapelig skrivemåte («1e3»)
 * og negative tall («-3»). Et område som «4-6» gir første tall (4).
 */
function integerIn(candidate: string | number): number | undefined {
  if (typeof candidate === "number") return Number.isInteger(candidate) ? candidate : undefined;
  const text = cleanText(candidate);
  const numbers = new RegExp(NUMBER_TOKEN); // eget objekt: `lastIndex` er tilstand
  let match: RegExpExecArray | null;
  while ((match = numbers.exec(text)) !== null) {
    const token = match[0];
    if (/[eE]/.test(token) || /[.,]/.test(token)) return undefined; // 1e3, 4.5
    // Bare et kort vindu rundt tallet trengs; hele teksten ville gjort letingen kvadratisk.
    const before = text.slice(Math.max(0, match.index - CONTEXT_BEFORE), match.index);
    const after = text.slice(
      match.index + token.length,
      match.index + token.length + CONTEXT_AFTER,
    );
    if (/[-\u2212]$/.test(before)) return undefined; // negativt tall

    const range = RANGE_UNIT_AFTER.exec(after);
    if (range) {
      numbers.lastIndex = match.index + token.length + range[1].length; // hopp over hele området
      continue;
    }
    if (
      UNIT_AFTER.test(after) ||
      FRACTION_AFTER.test(after) ||
      FRACTION_BEFORE.test(before) ||
      TIMES_AFTER.test(after) ||
      TIMES_BEFORE.test(before)
    ) {
      continue;
    }
    return Number(token);
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Ingredienser
// ---------------------------------------------------------------------------

function readIngredients(value: unknown): string[] {
  // En enkelt streng kan inneholde flere linjer (ofte skilt med linjeskift eller <br>).
  if (typeof value === "string") return cleanLines(value);
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  for (const item of value) {
    const text = isObject(item) ? cleanText(item.text) || cleanText(item.name) : cleanText(item);
    if (text !== "") result.push(text);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Steg
// ---------------------------------------------------------------------------

function readSteps(value: unknown): Step[] {
  const steps: Step[] = [];
  // Én streng, eller en liste med akkurat én streng, er en tekstblokk som deles i steg.
  const block = typeof value === "string" ? value : singleString(value);
  if (block !== undefined) {
    for (const text of splitBlock(block)) steps.push({ text, section: null });
    return steps;
  }
  collectSteps(value, null, 0, steps);
  return steps;
}

function singleString(value: unknown): string | undefined {
  return Array.isArray(value) && value.length === 1 && typeof value[0] === "string"
    ? value[0]
    : undefined;
}

function typeNames(node: Record<string, unknown>): string[] {
  const raw = node["@type"];
  const list = Array.isArray(raw) ? raw : [raw];
  return list
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim().replace(/^(?:https?:\/\/(?:www\.)?schema\.org\/|schema:)/, ""));
}

/** Går gjennom steg, lister og seksjoner i dokumentrekkefølge. */
function collectSteps(value: unknown, section: string | null, depth: number, out: Step[]): void {
  if (depth > MAX_STEP_DEPTH) return;
  if (typeof value === "string") {
    const text = cleanText(value);
    if (text !== "") out.push({ text, section });
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectSteps(item, section, depth + 1, out);
    return;
  }
  if (!isObject(value)) return;

  const types = typeNames(value);
  const isSection = types.includes("HowToSection");
  // HowToDirection og HowToTip teller bare med når de har `text`; HowToStep faller tilbake til `name`.
  const text = cleanText(value.text);
  const fallback = !isSection && !types.some((t) => t === "HowToDirection" || t === "HowToTip");
  const stepText =
    text !== "" ? text : fallback && !("itemListElement" in value) ? cleanText(value.name) : "";
  if (stepText !== "") {
    out.push({ text: stepText, section });
    return;
  }
  if ("itemListElement" in value) {
    const name = isSection ? cleanText(value.name) : "";
    collectSteps(value.itemListElement, name !== "" ? name : section, depth + 1, out);
  }
}

const LEADING_NUMBER = /^(?:(?:steg|step|trinn)\s*)?(\d{1,3})\s*[.):](?!\d)\s*/i;

/** Deler en tekstblokk i steg på linjeskift og tagger, og fjerner fullstendig nummerering. */
function splitBlock(block: string): string[] {
  const lines = cleanLines(block);
  if (lines.length === 1) {
    const inline = splitInlineNumbering(lines[0]);
    if (inline) return inline;
  }
  const numbered = lines.map((line) => LEADING_NUMBER.exec(line));
  const allNumbered =
    numbered.length > 0 && numbered.every((m, i) => m !== null && Number(m[1]) === i + 1);
  if (!allNumbered) return lines;
  return lines.map((line, i) => line.slice(numbered[i]![0].length).trim()).filter((l) => l !== "");
}

const MAX_INLINE_STEPS = 200;

/**
 * «1. Bland 2. Stek 3. Server» på én linje: deles bare når hele teksten starter med «1.» og
 * nummer 2, 3 … følger fortløpende (hvert foran et ord). Ellers `null` (blir ett steg).
 */
function splitInlineNumbering(line: string): string[] | null {
  const first = LEADING_NUMBER.exec(line);
  if (!first || Number(first[1]) !== 1) return null;
  const starts: { index: number; length: number }[] = [{ index: 0, length: first[0].length }];
  for (let n = 2; n <= MAX_INLINE_STEPS; n++) {
    const marker = new RegExp(
      `(?<=\\s)(?:(?:steg|step|trinn)\\s*)?${n}\\s*[.):](?!\\d)\\s*(?=\\p{L})`,
      "giu",
    );
    marker.lastIndex = starts[starts.length - 1].index + starts[starts.length - 1].length;
    const match = marker.exec(line);
    if (!match) break;
    starts.push({ index: match.index, length: match[0].length });
  }
  if (starts.length < 2) return null;
  return starts
    .map((start, i) =>
      line.slice(start.index + start.length, starts[i + 1]?.index ?? line.length).trim(),
    )
    .filter((text) => text !== "");
}
