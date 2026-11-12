import type { ManualRecipeValues } from "@/app/_shared/form-fields";
import { joinSections, type Recipe } from "@/domain";

/** Skjemaverdiene slik oppskriften står nå: én ingrediens og ett steg per linje. */
export function initialValuesOf(recipe: Recipe): ManualRecipeValues {
  const byPosition = <T extends { position: number }>(items: T[]) =>
    [...items].sort((a, b) => a.position - b.position);
  return {
    title: recipe.title,
    servings: recipe.originalServings === null ? "" : String(recipe.originalServings),
    yieldNote: recipe.yieldNote ?? "",
    minutes: recipe.totalMinutes == null ? "" : String(recipe.totalMinutes),
    ingredients: joinSections(
      byPosition(recipe.ingredients).map((line) => ({
        text: line.original,
        section: line.section,
      })),
    ).join("\n"),
    steps: joinSections(
      byPosition(recipe.steps).map((step) => ({ text: step.text, section: step.section })),
    ).join("\n"),
  };
}
