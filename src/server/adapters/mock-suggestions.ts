import "server-only";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { suggestForRecipe } from "@/domain";
import { appError, err, ok } from "@/lib/result";
import type { SuggestionProvider } from "../ports/suggestion-provider";

/** Mappen med eksempelsvar. Relativ til prosjektroten. */
export const DEFAULT_SUGGESTION_FIXTURE_DIR = join("test", "fixtures", "suggestions");

/**
 * Leverandøren uten nøkkel (AD-5, AD-11): enkle regler ut fra ingrediensene og stegene
 * (`suggestForRecipe`, Story 5.10), så forslagene passer retten. Passer ingen regel, velges et
 * generelt eksempelsett fra `test/fixtures/suggestions/*.json` ut fra oppskriftens id (sortert
 * filnavn, id modulo antall filer). Svaret er alltid merket som eksempel. Ingen nettverk.
 * Manglende mappe, tom mappe eller uleselig fil gir `suggestion_failed` (bare når reglene
 * ikke ga noe).
 */
export function createMockSuggestionProvider(
  fixtureDir: string = join(process.cwd(), DEFAULT_SUGGESTION_FIXTURE_DIR),
): SuggestionProvider {
  return {
    async suggest(recipe) {
      const tailored = suggestForRecipe(recipe);
      if (tailored.length > 0) return ok({ suggestions: tailored, isExample: true });
      try {
        const files = (await readdir(/* turbopackIgnore: true */ fixtureDir))
          .filter((name) => name.endsWith(".json"))
          .sort();
        if (files.length === 0) return err(appError("suggestion_failed", "no_fixtures"));
        const file = files[Math.abs(recipe.id) % files.length];
        const suggestions: unknown = JSON.parse(
          await readFile(join(/* turbopackIgnore: true */ fixtureDir, file), "utf8"),
        );
        return ok({ suggestions, isExample: true });
      } catch {
        return err(appError("suggestion_failed", "unreadable_fixture"));
      }
    },
  };
}
