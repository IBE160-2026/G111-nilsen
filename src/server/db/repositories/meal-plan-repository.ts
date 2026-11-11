import "server-only";
import { and, asc, between, desc, eq, isNotNull, sql } from "drizzle-orm";
import type { Db } from "../client";
import { mealPlanEntries, recipes } from "../schema";

/** En oppføring i ukemenyen med oppskriftens tittel og opprinnelige antall. */
export type MealPlanEntry = {
  id: number;
  day: string;
  servings: number;
  recipeId: number;
  title: string;
  originalServings: number | null;
};

/** Brukerens oppføringer fra og med `from` til og med `to`, sortert på dag og så rekkefølge lagt til. */
export function listEntries(db: Db, userId: number, from: string, to: string): MealPlanEntry[] {
  return db
    .select({
      id: mealPlanEntries.id,
      day: mealPlanEntries.day,
      servings: mealPlanEntries.servings,
      recipeId: mealPlanEntries.recipeId,
      title: recipes.title,
      originalServings: recipes.originalServings,
    })
    .from(mealPlanEntries)
    .innerJoin(recipes, eq(mealPlanEntries.recipeId, recipes.id))
    .where(and(eq(mealPlanEntries.userId, userId), between(mealPlanEntries.day, from, to)))
    .orderBy(asc(mealPlanEntries.day), asc(mealPlanEntries.id))
    .all();
}

/** Hver dag brukeren har planlagt noe på, med antall oppføringer, nyeste dag først. */
export function listPlannedDays(db: Db, userId: number): { day: string; count: number }[] {
  return db
    .select({ day: mealPlanEntries.day, count: sql<number>`count(*)` })
    .from(mealPlanEntries)
    .where(eq(mealPlanEntries.userId, userId))
    .groupBy(mealPlanEntries.day)
    .orderBy(desc(mealPlanEntries.day))
    .all();
}

/** En lagret oppskrift som kan legges på en dag. */
export type PlannableRecipe = {
  id: number;
  title: string;
  originalServings: number | null;
  selectedServings: number | null;
};

/** Brukerens lagrede oppskrifter, sortert på tittel, til «Legg til»-valget. */
export function listPlannableRecipes(db: Db, userId: number): PlannableRecipe[] {
  return db
    .select({
      id: recipes.id,
      title: recipes.title,
      originalServings: recipes.originalServings,
      selectedServings: recipes.selectedServings,
    })
    .from(recipes)
    .where(and(eq(recipes.userId, userId), isNotNull(recipes.savedAt)))
    .orderBy(asc(recipes.title), asc(recipes.id))
    .all();
}

/**
 * Legger en oppskrift på en dag. Oppskriften må være lagret og brukerens; ellers `null` og ingenting
 * lagres.
 */
export function insertEntry(
  db: Db,
  entry: { userId: number; recipeId: number; day: string; servings: number; createdAt: string },
): number | null {
  const owned = db
    .select({ id: recipes.id })
    .from(recipes)
    .where(
      and(
        eq(recipes.id, entry.recipeId),
        eq(recipes.userId, entry.userId),
        isNotNull(recipes.savedAt),
      ),
    )
    .get();
  if (!owned) return null;
  return db.insert(mealPlanEntries).values(entry).returning({ id: mealPlanEntries.id }).get().id;
}

/** Fjerner en av brukerens oppføringer. `false` når den ikke finnes eller er en annens. */
export function deleteEntry(db: Db, userId: number, id: number): boolean {
  return (
    db
      .delete(mealPlanEntries)
      .where(and(eq(mealPlanEntries.id, id), eq(mealPlanEntries.userId, userId)))
      .run().changes > 0
  );
}
