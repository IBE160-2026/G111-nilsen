import "server-only";
import { parseLine, type Recipe, type RecipeSummary } from "@/domain";
import { LIMITS, splitLines } from "@/lib/recipe-input";
import { appError, err, ok, type Result } from "@/lib/result";
import { getDb, type Db } from "../db/client";
import {
  deleteRecipeById,
  deleteStaleUnsavedRecipes,
  findRecipeById,
  insertRecipe,
  listFavoriteRecipes,
  listSavedRecipes,
  markRecipeSaved,
  setRecipeFavorite,
  updateRecipe,
  updateSelectedServings,
  type NewIngredientLine,
  type NewStep,
} from "../db/repositories/recipe-repository";

/** Ferdig validert input fra skjemaet «Legg inn selv». */
export type ManualRecipeInput = {
  title: string;
  servings: number;
  ingredients: string[];
  steps: string[];
};

type ManualRecipeField = "title" | "servings" | "ingredients" | "steps";

function linesOf(texts: string[]): string[] {
  return texts.flatMap(splitLines);
}

function tooLong(lines: string[], max: number): boolean {
  return lines.length > LIMITS.linesPerField || lines.some((line) => line.length > max);
}

/** Finner første felt som bryter grensene i `LIMITS`, eller `null`. */
function invalidField(
  title: string,
  servings: number,
  ingredients: string[],
  steps: string[],
): ManualRecipeField | null {
  if (title === "" || title.length > LIMITS.titleLength) return "title";
  if (
    !Number.isInteger(servings) ||
    servings < LIMITS.servingsMin ||
    servings > LIMITS.servingsMax
  ) {
    return "servings";
  }
  if (ingredients.length === 0 || tooLong(ingredients, LIMITS.ingredientLineLength)) {
    return "ingredients";
  }
  if (tooLong(steps, LIMITS.stepLength)) return "steps";
  return null;
}

type RecipeContent = { title: string; ingredients: NewIngredientLine[]; steps: NewStep[] };

/**
 * Validerer og bygger innholdet som skal lagres: tittel, tolkede ingredienslinjer og
 * steg. Brukes både ved ny oppskrift og ved redigering, så reglene er de samme.
 */
function buildContent(input: ManualRecipeInput): Result<RecipeContent> {
  const title = input.title.trim();
  const ingredients = linesOf(input.ingredients);
  const stepTexts = linesOf(input.steps);

  const invalid = invalidField(title, input.servings, ingredients, stepTexts);
  if (invalid) return err(appError("validation", invalid));

  return ok({
    title,
    ingredients: ingredients.map((text, position) => ({
      ...parseLine(text),
      position,
      section: null,
    })),
    steps: stepTexts.map((text, position) => ({ text, position, section: null })),
  });
}

/**
 * Lagrer en oppskrift brukeren har skrevet selv. Hver ingredienslinje tolkes med
 * `parseLine` og lagres med originaltekst (trimmet) og tolkede felt (AD-2).
 * Oppskriften legges rett i samlingen: `savedAt` settes til lagringstidspunktet.
 */
export function createManualRecipe(
  input: ManualRecipeInput,
  db: Db = getDb(),
): Result<{ id: number }> {
  const content = buildContent(input);
  if (!content.ok) return content;

  const now = new Date().toISOString();
  const id = insertRecipe(db, {
    title: content.value.title,
    sourceUrl: null,
    sourceName: null,
    originalServings: input.servings,
    selectedServings: null,
    savedAt: now,
    createdAt: now,
    updatedAt: now,
    ingredients: content.value.ingredients,
    steps: content.value.steps,
  });
  return ok({ id });
}

/**
 * Lagrer redigeringer av en oppskrift (Story 3.5). Samme validering og tolking som ved
 * ny oppskrift; ingredienser og steg erstattes. Kilde og samlingsstatus røres ikke.
 * Ukjent eller ugyldig id gir `not_found`, og ingenting lagres.
 */
export function updateManualRecipe(
  id: number,
  input: ManualRecipeInput,
  db: Db = getDb(),
): Result<{ id: number }> {
  if (!Number.isSafeInteger(id) || id < 1) return err(appError("not_found"));

  const content = buildContent(input);
  if (!content.ok) return content;

  const updated = updateRecipe(db, id, {
    title: content.value.title,
    originalServings: input.servings,
    updatedAt: new Date().toISOString(),
    ingredients: content.value.ingredients,
    steps: content.value.steps,
  });
  return updated ? ok({ id }) : err(appError("not_found"));
}

function isRecipeId(id: number): boolean {
  return Number.isSafeInteger(id) && id >= 1;
}

/**
 * Legger en oppskrift i samlingen (Story 3.2). En allerede lagret oppskrift beholder sitt
 * tidspunkt. Ugyldig eller ukjent id gir `not_found`.
 */
export function saveRecipeToCollection(id: number, db: Db = getDb()): Result<{ id: number }> {
  if (!isRecipeId(id)) return err(appError("not_found"));
  return markRecipeSaved(db, id, new Date().toISOString())
    ? ok({ id })
    : err(appError("not_found"));
}

/** Sletter oppskriften med ingredienser og steg. Ugyldig eller ukjent id gir `not_found`. */
export function deleteRecipe(id: number, db: Db = getDb()): Result<{ id: number }> {
  if (!isRecipeId(id)) return err(appError("not_found"));
  return deleteRecipeById(db, id) ? ok({ id }) : err(appError("not_found"));
}

/**
 * Husker valgt antall personer for en lagret oppskrift. Antall utenfor 1–50 eller ikke
 * heltall gir `validation` (felt `servings`). Ukjent id og ikke-lagret oppskrift gir `not_found`.
 */
export function setSelectedServings(
  id: number,
  servings: number,
  db: Db = getDb(),
): Result<{ id: number }> {
  if (!isRecipeId(id)) return err(appError("not_found"));
  if (
    !Number.isInteger(servings) ||
    servings < LIMITS.servingsMin ||
    servings > LIMITS.servingsMax
  ) {
    return err(appError("validation", "servings"));
  }
  return updateSelectedServings(db, id, servings) ? ok({ id }) : err(appError("not_found"));
}

/** Oppskrifter som aldri ble lagret ryddes bort etter så lang tid. */
export const UNSAVED_RECIPE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Sletter oppskrifter som ikke er i samlingen og er eldre enn et døgn (regnet fra `now`).
 * Lagrede oppskrifter røres aldri. Returnerer antall slettede.
 */
export function purgeStaleUnsavedRecipes(
  now: Date = new Date(),
  db: Db = getDb(),
): Result<{ deleted: number }> {
  const cutoff = new Date(now.getTime() - UNSAVED_RECIPE_MAX_AGE_MS).toISOString();
  return ok({ deleted: deleteStaleUnsavedRecipes(db, cutoff) });
}

/** Henter en oppskrift, eller `not_found` når id-en ikke finnes. */
export function getRecipe(id: number, db: Db = getDb()): Result<Recipe> {
  if (!Number.isSafeInteger(id) || id < 1) return err(appError("not_found"));
  const recipe = findRecipeById(db, id);
  return recipe ? ok(recipe) : err(appError("not_found"));
}

/** Oppskriftene i samlingen, sist lagret først. */
export function listCollection(db: Db = getDb()): Result<RecipeSummary[]> {
  return ok(listSavedRecipes(db));
}

/**
 * Markerer eller avmarkerer en lagret oppskrift som favoritt (Story 3.4). Eksplisitt verdi,
 * ikke «bytt», så gjentatte kall gir samme resultat. Ugyldig eller ukjent id og oppskrift som
 * ikke er i samlingen gir `not_found`, og ingenting endres.
 */
export function setFavorite(
  recipeId: number,
  isFavorite: boolean,
  db: Db = getDb(),
): Result<{ id: number; isFavorite: boolean }> {
  if (!isRecipeId(recipeId)) return err(appError("not_found"));
  if (typeof isFavorite !== "boolean") return err(appError("validation", "isFavorite"));
  return setRecipeFavorite(db, recipeId, isFavorite)
    ? ok({ id: recipeId, isFavorite })
    : err(appError("not_found"));
}

/** Favorittene i samlingen, sist lagret først. */
export function listFavorites(db: Db = getDb()): Result<RecipeSummary[]> {
  return ok(listFavoriteRecipes(db));
}
