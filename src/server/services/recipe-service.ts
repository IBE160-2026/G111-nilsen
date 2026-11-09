import "server-only";
import { parseLine, type Recipe } from "@/domain";
import { LIMITS, splitLines } from "@/lib/recipe-input";
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
  const ingredients = linesOf(input.ingredients);
  const stepTexts = linesOf(input.steps);

  const invalid = invalidField(title, input.servings, ingredients, stepTexts);
  if (invalid) return err(appError("validation", invalid));

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
