import { parseLine } from "./parse-line";
import type { Recipe, RecipeTranslation } from "./types";

/** Rekkefølgen oversettelsen er lagret i: posisjon, så id. */
export function byPositionThenId<T extends { position: number; id: number }>(
  items: readonly T[],
): T[] {
  return [...items].sort((a, b) => a.position - b.position || a.id - b.id);
}

/**
 * Oppskriften slik den vises på norsk (Story 6.36b): tittel, ingredienser og steg byttes ut, mens
 * id, posisjon og deler beholdes. Passer ikke antallet (oppskriften er endret etter oversettelsen),
 * er den norske teksten ikke trygg å bruke, og originalen returneres uendret.
 */
export function applyTranslation(recipe: Recipe, translation: RecipeTranslation): Recipe {
  const ingredients = byPositionThenId(recipe.ingredients);
  const steps = byPositionThenId(recipe.steps);
  if (
    ingredients.length !== translation.ingredients.length ||
    steps.length !== translation.steps.length
  ) {
    return recipe;
  }
  const section = (name: string | null) =>
    name === null ? null : (translation.sections[name] ?? name);
  return {
    ...recipe,
    title: translation.title,
    ingredients: ingredients.map((line, i) => ({
      ...parseLine(translation.ingredients[i]),
      id: line.id,
      position: line.position,
      section: section(line.section),
      ...(line.suggested ? { suggested: true } : {}),
    })),
    steps: steps.map((step, i) => ({
      ...step,
      text: translation.steps[i],
      section: section(step.section),
    })),
  };
}

/** Om oversettelsen hører til oppskriften slik den er nå (samme antall linjer og steg). */
export function translationFits(recipe: Recipe, translation: RecipeTranslation): boolean {
  return (
    recipe.ingredients.length === translation.ingredients.length &&
    recipe.steps.length === translation.steps.length
  );
}

const ENGLISH = new Set(
  (
    "the and with until add mix bake stir minutes minute cup cups tablespoon tablespoons teaspoon " +
    "teaspoons oven bowl flour sugar butter eggs milk heat cook then about place pour serve degrees " +
    "preheat combine whisk cool chopped sliced diced large small medium of for into over low high"
  ).split(" "),
);
// «over» står i begge språk og er derfor ikke med her.
ENGLISH.delete("over");
const NORWEGIAN = new Set(
  (
    "og med til på minutter minutt stek bland rør kok hell ha ovnen skål mel sukker smør melk " +
    "eggene ca når som en et av hakket skåret stor liten fedd ss ts dl"
  ).split(" "),
);

/**
 * Gjetter om oppskriften er skrevet på engelsk (Story 6.36b), for å vise «Oversett til norsk» bare
 * der det gir mening. Teller vanlige engelske og norske ord i tittel, ingredienser og steg.
 */
export function looksEnglish(recipe: Pick<Recipe, "title" | "ingredients" | "steps">): boolean {
  const text = [
    recipe.title,
    ...recipe.ingredients.map((line) => line.original),
    ...recipe.steps.map((step) => step.text),
  ]
    .join(" ")
    .toLocaleLowerCase("en");
  let english = 0;
  let norwegian = 0;
  for (const word of text.match(/[a-zæøå]+/g) ?? []) {
    if (ENGLISH.has(word)) english++;
    else if (NORWEGIAN.has(word)) norwegian++;
  }
  return english >= 3 && english > norwegian * 2;
}
