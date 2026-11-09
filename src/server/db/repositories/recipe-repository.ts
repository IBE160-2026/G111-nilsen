import "server-only";
import { asc, eq } from "drizzle-orm";
import type { Quantity, Recipe, RecipeLine, Step, UnitKey } from "@/domain";
import type { Db } from "../client";
import { ingredientLines, recipes, steps } from "../schema";

/** En ingredienslinje klar til lagring (tolket, ikke skalert). */
export type NewIngredientLine = Omit<RecipeLine, "id">;
export type NewStep = Omit<Step, "id">;

export type NewRecipe = {
  title: string;
  sourceUrl: string | null;
  sourceName: string | null;
  originalServings: number | null;
  selectedServings: number | null;
  savedAt: string | null;
  createdAt: string;
  updatedAt: string;
  ingredients: NewIngredientLine[];
  steps: NewStep[];
};

/** Lagrer oppskrift, ingredienslinjer og steg i én transaksjon og returnerer ny id. */
export function insertRecipe(db: Db, recipe: NewRecipe): number {
  return db.transaction((tx) => {
    const { id } = tx
      .insert(recipes)
      .values({
        title: recipe.title,
        sourceUrl: recipe.sourceUrl,
        sourceName: recipe.sourceName,
        originalServings: recipe.originalServings,
        selectedServings: recipe.selectedServings,
        savedAt: recipe.savedAt,
        createdAt: recipe.createdAt,
        updatedAt: recipe.updatedAt,
      })
      .returning({ id: recipes.id })
      .get();

    if (recipe.ingredients.length > 0) {
      tx.insert(ingredientLines)
        .values(
          recipe.ingredients.map((line) => ({
            recipeId: id,
            position: line.position,
            section: line.section,
            originalText: line.original,
            quantityMin: line.quantity?.min ?? null,
            quantityMax: line.quantity?.max ?? null,
            unit: line.unit,
            name: line.name,
            parseable: line.parseable,
          })),
        )
        .run();
    }

    if (recipe.steps.length > 0) {
      tx.insert(steps)
        .values(
          recipe.steps.map((step) => ({
            recipeId: id,
            position: step.position,
            section: step.section,
            text: step.text,
          })),
        )
        .run();
    }

    return id;
  });
}

/** Feltene en redigering endrer. Kilde, mappe, `savedAt`, `createdAt` og `id` røres ikke. */
export type RecipeUpdate = {
  title: string;
  originalServings: number | null;
  updatedAt: string;
  ingredients: NewIngredientLine[];
  steps: NewStep[];
};

/**
 * Erstatter tittel, porsjonsantall, ingredienslinjer og steg i én transaksjon.
 * Endres `originalServings`, nullstilles `selectedServings`, siden et tidligere valgt
 * antall hører til den gamle oppskriften. Feiler noe, rulles alt tilbake.
 * Returnerer `false` når id-en ikke finnes (ingenting er endret).
 */
export function updateRecipe(db: Db, id: number, data: RecipeUpdate): boolean {
  return db.transaction((tx) => {
    const current = tx
      .select({ originalServings: recipes.originalServings })
      .from(recipes)
      .where(eq(recipes.id, id))
      .get();
    if (!current) return false;

    tx.update(recipes)
      .set({
        title: data.title,
        originalServings: data.originalServings,
        updatedAt: data.updatedAt,
        ...(current.originalServings !== data.originalServings ? { selectedServings: null } : {}),
      })
      .where(eq(recipes.id, id))
      .run();

    tx.delete(ingredientLines).where(eq(ingredientLines.recipeId, id)).run();
    tx.delete(steps).where(eq(steps.recipeId, id)).run();

    if (data.ingredients.length > 0) {
      tx.insert(ingredientLines)
        .values(
          data.ingredients.map((line) => ({
            recipeId: id,
            position: line.position,
            section: line.section,
            originalText: line.original,
            quantityMin: line.quantity?.min ?? null,
            quantityMax: line.quantity?.max ?? null,
            unit: line.unit,
            name: line.name,
            parseable: line.parseable,
          })),
        )
        .run();
    }

    if (data.steps.length > 0) {
      tx.insert(steps)
        .values(
          data.steps.map((step) => ({
            recipeId: id,
            position: step.position,
            section: step.section,
            text: step.text,
          })),
        )
        .run();
    }

    return true;
  });
}

function toQuantity(min: number | null, max: number | null): Quantity | null {
  if (min === null) return null;
  return max === null ? { min } : { min, max };
}

/** Henter en oppskrift med linjer og steg sortert på `position`, eller `null`. */
export function findRecipeById(db: Db, id: number): Recipe | null {
  const row = db.select().from(recipes).where(eq(recipes.id, id)).get();
  if (!row) return null;

  const lines = db
    .select()
    .from(ingredientLines)
    .where(eq(ingredientLines.recipeId, id))
    .orderBy(asc(ingredientLines.position), asc(ingredientLines.id))
    .all();

  const stepRows = db
    .select()
    .from(steps)
    .where(eq(steps.recipeId, id))
    .orderBy(asc(steps.position), asc(steps.id))
    .all();

  return {
    id: row.id,
    title: row.title,
    sourceUrl: row.sourceUrl,
    sourceName: row.sourceName,
    originalServings: row.originalServings,
    selectedServings: row.selectedServings,
    savedAt: row.savedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ingredients: lines.map((line) => ({
      id: line.id,
      position: line.position,
      section: line.section,
      original: line.originalText,
      quantity: toQuantity(line.quantityMin, line.quantityMax),
      unit: line.unit as UnitKey | null,
      name: line.name,
      parseable: line.parseable,
    })),
    steps: stepRows.map((step) => ({
      id: step.id,
      position: step.position,
      section: step.section,
      text: step.text,
    })),
  };
}
