import "server-only";
import { parseLine, type Recipe } from "@/domain";
import { appError, err, ok, type Result } from "@/lib/result";
import { getDb, type Db } from "../db/client";
import {
  findRecipeById,
  insertRecipe,
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

function cleanLines(lines: string[]): string[] {
  return lines.map((line) => line.trim()).filter((line) => line !== "");
}

/**
 * Lagrer en oppskrift brukeren har skrevet selv. Hver ingredienslinje tolkes med
 * `parseLine` og lagres med originaltekst (trimmet) og tolkede felt (AD-2).
 * Oppskriften legges ikke i samlingen (`savedAt = null`).
 */
export function createManualRecipe(
  input: ManualRecipeInput,
  db: Db = getDb(),
): Result<{ id: number }> {
  const title = input.title.trim();
  const ingredients = cleanLines(input.ingredients);
  const stepTexts = cleanLines(input.steps);

  if (title === "") return err(appError("validation", "title"));
  if (!Number.isInteger(input.servings) || input.servings < 1) {
    return err(appError("validation", "servings"));
  }
  if (ingredients.length === 0) return err(appError("validation", "ingredients"));

  const lines: NewIngredientLine[] = ingredients.map((text, position) => ({
    ...parseLine(text),
    position,
    section: null,
  }));
  const steps: NewStep[] = stepTexts.map((text, position) => ({ text, position, section: null }));

  const now = new Date().toISOString();
  const id = insertRecipe(db, {
    title,
    sourceUrl: null,
    sourceName: null,
    originalServings: input.servings,
    selectedServings: null,
    savedAt: null,
    createdAt: now,
    updatedAt: now,
    ingredients: lines,
    steps,
  });
  return ok({ id });
}

/** Henter en oppskrift, eller `not_found` når id-en ikke finnes. */
export function getRecipe(id: number, db: Db = getDb()): Result<Recipe> {
  if (!Number.isSafeInteger(id) || id < 1) return err(appError("not_found"));
  const recipe = findRecipeById(db, id);
  return recipe ? ok(recipe) : err(appError("not_found"));
}
