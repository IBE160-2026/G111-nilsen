import { parseLine } from "./parse-line";

/** Et utkast til oppskrift fra limt tekst (Story 6.14). Alle felt er tekst, klare for skjemaet. */
export type RecipeDraft = {
  title: string;
  servings: string;
  minutes: string;
  /** Én ingrediens per linje. */
  ingredients: string;
  /** Ett steg per linje. */
  steps: string;
};

const INGREDIENTS_HEADING = /^(ingredienser|ingrediensliste|du trenger|dette trenger du)\s*:?$/i;
const STEPS_HEADING =
  /^(fremgangsmåte|framgangsmåte|slik gjør du( det)?|gjør slik|steg|trinn|tilberedning|instruksjoner|metode)\s*:?$/i;
const BULLET = /^(?:[-•*–·▪◦]|\[[ xX]?\]|☐|☑)\s+/;
const STEP_NUMBER = /^(?:(?:steg|trinn)\s*)?\d{1,2}\s*[.):]\s*/i;
const SERVINGS =
  /(?:(?:porsjoner|personer|pers\.?)\s*:?\s*(\d{1,3})\b)|(?:\b(\d{1,3})\s*(?:porsjoner|porsjon|personer|pers\b))/i;
const TIME_LINE = /^(?:total\s*tid|tilberedningstid|koketid|steketid|tid)\b/i;
const HOURS_MINUTES =
  /(\d{1,2})\s*(?:timer|time|t)\b(?:\s*(?:og)?\s*(\d{1,2})\s*(?:minutter|min)\b)?/i;
const MINUTES = /(\d{1,4})\s*(?:minutter|min)\b/i;

function minutesIn(line: string): number | null {
  const hours = HOURS_MINUTES.exec(line);
  if (hours) return Number(hours[1]) * 60 + Number(hours[2] ?? 0);
  const minutes = MINUTES.exec(line);
  return minutes ? Number(minutes[1]) : null;
}

/**
 * Tolker limt tekst til et utkast (Story 6.14): tittel (første linje), porsjoner, tid,
 * ingredienser og steg. Overskrifter som «Ingredienser» og «Fremgangsmåte» deler teksten; uten dem
 * regnes korte linjer med mengde som ingredienser og resten som steg. Ren funksjon.
 */
export function parseRecipeText(text: string): RecipeDraft {
  const lines = text
    .normalize("NFC")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");

  const draft = { title: "", servings: "", minutes: "" };
  const ingredients: string[] = [];
  const steps: string[] = [];
  const untagged: string[] = [];
  const hasHeadings = lines.some((l) => INGREDIENTS_HEADING.test(l) || STEPS_HEADING.test(l));

  let section: "intro" | "ingredients" | "steps" = "intro";
  let titleTaken = false;
  for (const line of lines) {
    if (INGREDIENTS_HEADING.test(line)) {
      section = "ingredients";
      titleTaken = true;
      continue;
    }
    if (STEPS_HEADING.test(line)) {
      section = "steps";
      titleTaken = true;
      continue;
    }
    if (section === "intro") {
      if (!titleTaken) {
        draft.title = line.replace(BULLET, "");
        titleTaken = true;
        continue;
      }
      const servings = SERVINGS.exec(line);
      if (servings && draft.servings === "") {
        draft.servings = servings[1] ?? servings[2] ?? "";
        continue;
      }
      if (TIME_LINE.test(line) && draft.minutes === "") {
        const minutes = minutesIn(line);
        if (minutes !== null) {
          draft.minutes = String(minutes);
          continue;
        }
      }
      if (hasHeadings) continue; // ingress mellom tittel og overskrift er ikke en del av skjemaet
      untagged.push(line);
    } else if (section === "ingredients") {
      const item = line.replace(BULLET, "");
      if (item !== "" && !item.endsWith(":")) ingredients.push(item);
    } else {
      const step = line.replace(BULLET, "").replace(STEP_NUMBER, "");
      if (step !== "") steps.push(step);
    }
  }

  if (!hasHeadings) {
    for (const line of untagged) {
      const item = line.replace(BULLET, "");
      const bullet = BULLET.test(line);
      if (item.length <= 80 && (bullet || parseLine(item).quantity !== null)) {
        ingredients.push(item);
      } else {
        const step = item.replace(STEP_NUMBER, "");
        if (step !== "") steps.push(step);
      }
    }
  }

  return {
    ...draft,
    ingredients: ingredients.join("\n"),
    steps: steps.join("\n"),
  };
}
