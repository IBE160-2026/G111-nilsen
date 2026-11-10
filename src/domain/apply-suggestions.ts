import { normalizeSearch } from "./filter-collection";
import { parseLine } from "./parse-line";
import { tipPlacement } from "./suggest-for-recipe";
import type { AppliedSuggestion, RecipeLine, Step } from "./types";

/** Oppskriften slik den vises med forslagene brukeren har tatt i bruk. */
export type RecipeWithSuggestions = {
  ingredients: RecipeLine[];
  steps: Step[];
  /** Forslag om hele retten (for eksempel servering), vist under stegene. */
  tips: string[];
};

function stepMatches(step: Step, stems: readonly string[]): boolean {
  const text = normalizeSearch(step.text);
  return stems.some((stem) => new RegExp(`(?:^|[^\\p{L}])${stem}`, "u").test(text));
}

/**
 * Legger forslagene som er tatt i bruk inn i ingredienslisten og stegene (Story 5.11), uten å
 * endre originalen (AD-2): det er en ny visning, og «Fjern» tar dem bort igjen. Et
 * ingrediensforslag blir en merket linje sist (enkle forslag har en kort linje som tolkes og
 * skaleres; ellers står forslagsteksten). Et stegforslag settes foran første steg som passer
 * (`before`), ellers sist. Forslag om hele retten blir `tips`. Forslagene får negative id-er, så
 * de ikke kolliderer med lagrede linjer og steg. Kaster aldri.
 */
export function withAppliedSuggestions(
  ingredients: readonly RecipeLine[],
  steps: readonly Step[],
  suggestions: readonly AppliedSuggestion[],
): RecipeWithSuggestions {
  const lines = [...ingredients].sort((a, b) => a.position - b.position);
  const ordered = [...steps].sort((a, b) => a.position - b.position);
  const tips: string[] = [];
  let lastPosition = lines.reduce((max, line) => Math.max(max, line.position), 0);

  for (const suggestion of suggestions) {
    const placement = tipPlacement(suggestion.text);
    if (suggestion.appliesTo === "ingredients") {
      lastPosition += 1;
      lines.push({
        ...parseLine(placement?.line ?? suggestion.text),
        id: -suggestion.id,
        position: lastPosition,
        section: null,
        suggested: true,
      });
    } else if (suggestion.appliesTo === "steps") {
      const step: Step = {
        id: -suggestion.id,
        position: 0,
        section: null,
        text: suggestion.text,
        suggested: true,
      };
      const before = placement?.before;
      const index =
        before === undefined
          ? -1
          : before.includes("*")
            ? 0
            : ordered.findIndex((other) => !other.suggested && stepMatches(other, before));
      if (index === -1) ordered.push(step);
      else ordered.splice(index, 0, step);
    } else {
      tips.push(suggestion.text);
    }
  }

  return {
    ingredients: lines,
    steps: ordered.map((step, index) => ({ ...step, position: index + 1 })),
    tips,
  };
}
