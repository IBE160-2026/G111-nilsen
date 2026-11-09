import type { ManualRecipeValues } from "@/app/_shared/form-fields";
import type { Recipe } from "@/domain";

/** Skjemaverdiene slik oppskriften står nå: én ingrediens og ett steg per linje. */
export function initialValuesOf(recipe: Recipe): ManualRecipeValues {
  const byPosition = <T extends { position: number }>(items: T[]) =>
    [...items].sort((a, b) => a.position - b.position);
  return {
    title: recipe.title,
    servings: recipe.originalServings === null ? "" : String(recipe.originalServings),
    ingredients: byPosition(recipe.ingredients)
      .map((line) => line.original)
      .join("\n"),
    steps: byPosition(recipe.steps)
      .map((step) => step.text)
      .join("\n"),
  };
}
