import "server-only";
import type { AppliedSuggestion, SuggestionSet } from "@/domain";
import { appError, err, ok, type Result } from "@/lib/result";
import { createLlmSuggestionProvider } from "../adapters/llm-suggestions";
import { createMockSuggestionProvider } from "../adapters/mock-suggestions";
import { config, type Config, type SuggestionMode } from "../config";
import { getDb, type Db } from "../db/client";
import {
  deleteAppliedSuggestion,
  insertAppliedSuggestion,
} from "../db/repositories/suggestion-repository";
import {
  suggestionSchema,
  suggestionsSchema,
  type SuggestionProvider,
} from "../ports/suggestion-provider";
import { getRecipe } from "./recipe-service";

/**
 * Leverandør per modus (AD-5): mock uten nøkkel, ellers språkmodell-adapteren (Story 4.3). Én
 * språkmodell-leverandør lages per prosess, så grensen mot gjentatte kall teller på tvers av kall.
 */
let llmProvider: { key: string; model: string | undefined; provider: SuggestionProvider } | null =
  null;

export function providerFor(
  mode: SuggestionMode,
  settings: Pick<Config, "llmApiKey" | "llmModel"> = config,
): SuggestionProvider {
  if (mode === "mock" || !settings.llmApiKey) return createMockSuggestionProvider();
  if (
    !llmProvider ||
    llmProvider.key !== settings.llmApiKey ||
    llmProvider.model !== settings.llmModel
  ) {
    llmProvider = {
      key: settings.llmApiKey,
      model: settings.llmModel,
      provider: createLlmSuggestionProvider({
        apiKey: settings.llmApiKey,
        model: settings.llmModel,
      }),
    };
  }
  return llmProvider.provider;
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

/**
 * Tar et forslag i bruk og lagrer det med oppskriften (Story 4.2, FR-11). Forslaget valideres
 * med `suggestionSchema` (kommer fra klienten); ugyldig gir `validation`, ukjent oppskrift
 * `not_found`. Samme tekst to ganger gir det som allerede er lagret. Ingredienser, steg og
 * `updatedAt` endres ikke.
 */
export function applySuggestion(
  recipeId: number,
  suggestion: unknown,
  db: Db = getDb(),
  now: () => Date = () => new Date(),
): Result<AppliedSuggestion> {
  const recipe = getRecipe(recipeId, db);
  if (!recipe.ok) return recipe;
  const parsed = suggestionSchema.safeParse(suggestion);
  if (!parsed.success) return err(appError("validation", "suggestion"));
  const stored = insertAppliedSuggestion(db, recipeId, parsed.data, now().toISOString());
  return stored ? ok(stored) : err(appError("not_found"));
}

/** Fjerner et valgt forslag fra oppskriften (Story 4.2). Ukjent forslag eller oppskrift gir `not_found`. */
export function removeAppliedSuggestion(
  recipeId: number,
  suggestionId: number,
  db: Db = getDb(),
): Result<{ id: number }> {
  if (!Number.isSafeInteger(suggestionId) || suggestionId < 1) return err(appError("not_found"));
  return deleteAppliedSuggestion(db, recipeId, suggestionId)
    ? ok({ id: suggestionId })
    : err(appError("not_found"));
}
