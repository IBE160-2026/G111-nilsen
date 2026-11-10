import "server-only";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { appError, err, ok } from "@/lib/result";
import type { SuggestionProvider } from "../ports/suggestion-provider";

/** Mappen med eksempelsvar. Relativ til prosjektroten. */
export const DEFAULT_SUGGESTION_FIXTURE_DIR = join("test", "fixtures", "suggestions");

/**
 * Mock-leverandøren (AD-5, AD-11): leser eksempelsvar fra `test/fixtures/suggestions/*.json`
 * og velger ett sett ut fra oppskriftens id (sortert filnavn, id modulo antall filer), så samme
 * oppskrift gir samme forslag. Svaret er alltid merket som eksempel. Ingen nettverk.
 * Manglende mappe, tom mappe eller uleselig fil gir `suggestion_failed`.
 */
export function createMockSuggestionProvider(
  fixtureDir: string = join(process.cwd(), DEFAULT_SUGGESTION_FIXTURE_DIR),
): SuggestionProvider {
  return {
    async suggest(recipe) {
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
