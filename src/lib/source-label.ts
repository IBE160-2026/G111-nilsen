import type { Recipe } from "@/domain";
import { sourceMessages } from "./messages";

/** Kilden som vises: navnet, ellers vertsnavnet fra lenken, ellers «Lagt inn selv». */
export function sourceLabel(recipe: Pick<Recipe, "sourceName" | "sourceUrl">): string {
  const name = recipe.sourceName?.trim();
  if (name) return name;
  if (recipe.sourceUrl) {
    try {
      return new URL(recipe.sourceUrl).hostname.replace(/^www\./, "");
    } catch {
      // Ugyldig lenke: vis reserveteksten.
    }
  }
  return sourceMessages.manual;
}
