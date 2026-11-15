import "server-only";
import { appError, err, ok, type Result } from "@/lib/result";
import type { RecipeTranslation } from "@/domain";
import { createLlmTranslationProvider } from "../adapters/llm-translation";
import { config, type Config } from "../config";
import { getDb, type Db } from "../db/client";
import {
  deleteTranslation,
  saveTranslation,
  setTranslationActive,
} from "../db/repositories/recipe-repository";
import { translationSchema, type TranslationProvider } from "../ports/translation-provider";
import { getRecipe } from "./recipe-service";

let llmProvider: { key: string; model: string | undefined; provider: TranslationProvider } | null =
  null;

/** Leverandøren, eller `null` uten nøkkel (oversettelse er da ikke slått på). Én per prosess. */
export function translationProviderFor(
  settings: Pick<Config, "llmApiKey" | "llmModel"> = config,
): TranslationProvider | null {
  if (!settings.llmApiKey) return null;
  if (
    !llmProvider ||
    llmProvider.key !== settings.llmApiKey ||
    llmProvider.model !== settings.llmModel
  ) {
    llmProvider = {
      key: settings.llmApiKey,
      model: settings.llmModel,
      provider: createLlmTranslationProvider({
        apiKey: settings.llmApiKey,
        model: settings.llmModel,
      }),
    };
  }
  return llmProvider.provider;
}

/**
 * Lager og lagrer en norsk versjon av oppskriften (Story 6.36b). Svaret fra leverandøren valideres
 * med `translationSchema`, og antall ingredienser og steg må være det samme som i originalen. Ukjent
 * oppskrift gir `not_found`, manglende nøkkel `translation_unavailable`, og alt annet som går galt
 * `translation_failed`. En eksisterende oversettelse erstattes. Originalen endres ikke.
 */
export async function translateRecipe(
  recipeId: number,
  db: Db = getDb(),
  provider: TranslationProvider | null = translationProviderFor(),
  now: () => Date = () => new Date(),
): Promise<Result<RecipeTranslation>> {
  const recipe = getRecipe(recipeId, db);
  if (!recipe.ok) return recipe;
  if (provider === null) return err(appError("translation_unavailable"));

  let raw;
  try {
    raw = await provider.translate(recipe.value);
  } catch {
    return err(appError("translation_failed", "provider_threw"));
  }
  if (!raw.ok) return err(appError("translation_failed", raw.error.detail));

  const parsed = translationSchema.safeParse(raw.value);
  if (
    !parsed.success ||
    parsed.data.ingredients.length !== recipe.value.ingredients.length ||
    parsed.data.steps.length !== recipe.value.steps.length
  ) {
    return err(appError("translation_failed", "invalid_response"));
  }
  const translation: RecipeTranslation = { ...parsed.data, active: true };
  return saveTranslation(db, recipeId, translation, now().toISOString())
    ? ok(translation)
    : err(appError("not_found"));
}

/** Viser den norske versjonen (`true`) eller originalen (`false`). `not_found` uten oversettelse. */
export function setTranslationView(
  recipeId: number,
  active: boolean,
  db: Db = getDb(),
): Result<{ id: number }> {
  return setTranslationActive(db, recipeId, active)
    ? ok({ id: recipeId })
    : err(appError("not_found"));
}

/** Fjerner den norske versjonen. `not_found` når det ikke fantes noen. */
export function removeTranslation(recipeId: number, db: Db = getDb()): Result<{ id: number }> {
  return deleteTranslation(db, recipeId) ? ok({ id: recipeId }) : err(appError("not_found"));
}
