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

/** Gjør et forslag om til en setning som kan stå i stegteksten (punktum til slutt). */
function sentence(text: string): string {
  const trimmed = text.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/**
 * Legger forslagene som er tatt i bruk inn i ingredienslisten og stegteksten (Story 5.11, 5.12),
 * uten å endre originalen (AD-2): det er en ny visning, og «Fjern» tar dem bort igjen.
 *
 * - Ingrediensforslag blir en merket linje sist (enkle forslag har en kort linje som tolkes og
 *   skaleres; ellers står forslagsteksten). Har forslaget en `stepText`, flettes den inn etter
 *   teksten i første steg som passer `into`.
 * - Stegforslag flettes inn foran teksten i steget det hører til (`before`, «*» = første steg).
 *   Uten plassering, eller når ingen steg passer, legges det etter teksten i siste steg. Har
 *   oppskriften ingen steg, blir forslaget et eget merket steg.
 * - Forslag om hele retten blir `tips`.
 *
 * Forslagslinjer og -steg får negative id-er, så de ikke kolliderer med lagrede. Kaster aldri.
 */
export function withAppliedSuggestions(
  ingredients: readonly RecipeLine[],
  steps: readonly Step[],
  suggestions: readonly AppliedSuggestion[],
): RecipeWithSuggestions {
  const lines = [...ingredients].sort((a, b) => a.position - b.position);
  const ordered: Step[] = [...steps]
    .sort((a, b) => a.position - b.position)
    .map((step) => ({ ...step }));
  const tips: string[] = [];
  let lastPosition = lines.reduce((max, line) => Math.max(max, line.position), 0);

  const addTo = (index: number, where: "addedBefore" | "addedAfter", text: string) => {
    const step = ordered[index];
    step[where] = [...(step[where] ?? []), sentence(text)];
  };

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
      if (placement?.stepText && placement.into) {
        const index = ordered.findIndex(
          (step) => !step.suggested && stepMatches(step, placement.into!),
        );
        if (index !== -1) addTo(index, "addedAfter", placement.stepText);
      }
    } else if (suggestion.appliesTo === "steps") {
      const real = ordered.filter((step) => !step.suggested);
      if (real.length === 0) {
        ordered.push({
          id: -suggestion.id,
          position: 0,
          section: null,
          text: suggestion.text,
          suggested: true,
        });
        continue;
      }
      const before = placement?.before;
      const index =
        before === undefined
          ? -1
          : before.includes("*")
            ? ordered.indexOf(real[0])
            : ordered.findIndex((step) => !step.suggested && stepMatches(step, before));
      if (index !== -1) addTo(index, "addedBefore", suggestion.text);
      else addTo(ordered.indexOf(real[real.length - 1]), "addedAfter", suggestion.text);
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
