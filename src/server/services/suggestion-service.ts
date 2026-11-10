import "server-only";
import type { SuggestionSet } from "@/domain";
import { appError, err, ok, type Result } from "@/lib/result";
import { createMockSuggestionProvider } from "../adapters/mock-suggestions";
import { config, type SuggestionMode } from "../config";
import { getDb, type Db } from "../db/client";
import { suggestionsSchema, type SuggestionProvider } from "../ports/suggestion-provider";
import { getRecipe } from "./recipe-service";

/**
 * Leverandør per modus (AD-5). Språkmodell-adapteren kommer i Story 4.3 og tar over `llm`; til da
 * brukes mock også med nøkkel, og svaret er fortsatt merket som eksempel, så merket er alltid riktig.
 */
const providers: Record<SuggestionMode, () => SuggestionProvider> = {
  mock: createMockSuggestionProvider,
  llm: createMockSuggestionProvider,
};

export function providerFor(mode: SuggestionMode): SuggestionProvider {
  return providers[mode]();
}

/**
 * Henter 1–3 forslag for en oppskrift (FR-10, AD-5). Alt fra leverandøren valideres med
 * `suggestionsSchema` før det returneres. Ukjent oppskrift gir `not_found`; feil fra leverandøren,
 * kast og ugyldig svar gir `suggestion_failed`. Forslagene lagres ikke.
 */
export async function getSuggestions(
  recipeId: number,
  db: Db = getDb(),
  provider: SuggestionProvider = providerFor(config.suggestionMode),
): Promise<Result<SuggestionSet>> {
  const recipe = getRecipe(recipeId, db);
  if (!recipe.ok) return recipe;

  let raw;
  try {
    raw = await provider.suggest(recipe.value);
  } catch {
    return err(appError("suggestion_failed", "provider_threw"));
  }
  if (!raw.ok) return err(appError("suggestion_failed", raw.error.detail));

  const parsed = suggestionsSchema.safeParse(raw.value.suggestions);
  if (!parsed.success || typeof raw.value.isExample !== "boolean") {
    return err(appError("suggestion_failed", "invalid_response"));
  }
  return ok({ suggestions: parsed.data, isExample: raw.value.isExample });
}
