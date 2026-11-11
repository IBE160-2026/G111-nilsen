import "server-only";
import { and, asc, between, desc, eq, inArray, isNotNull } from "drizzle-orm";
import type { Db } from "../client";
import { mealPlanEntries, recipes, weekChecks } from "../schema";

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

/** Alle brukerens oppføringer med dag og tittel, nyeste dag først og så rekkefølge lagt til. */
export function listPlannedMeals(db: Db, userId: number): { day: string; title: string }[] {
  return db
    .select({ day: mealPlanEntries.day, title: recipes.title })
    .from(mealPlanEntries)
    .innerJoin(recipes, eq(mealPlanEntries.recipeId, recipes.id))
    .where(eq(mealPlanEntries.userId, userId))
    .orderBy(desc(mealPlanEntries.day), asc(mealPlanEntries.id))
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

/**
 * Erstatter alle brukerens oppføringer fra og med `from` til og med `to` med `entries`, i én
 * transaksjon. Alle oppskriftene må være lagret og brukerens; ellers `false` og ingenting endres.
 */
export function replaceWeek(
  db: Db,
  userId: number,
  from: string,
  to: string,
  entries: readonly { recipeId: number; day: string; servings: number }[],
  createdAt: string,
): boolean {
  return db.transaction((tx) => {
    const ids = [...new Set(entries.map((entry) => entry.recipeId))];
    if (ids.length > 0) {
      const owned = tx
        .select({ id: recipes.id })
        .from(recipes)
        .where(
          and(eq(recipes.userId, userId), isNotNull(recipes.savedAt), inArray(recipes.id, ids)),
        )
        .all();
      if (owned.length !== ids.length) return false;
    }
    tx.delete(mealPlanEntries)
      .where(and(eq(mealPlanEntries.userId, userId), between(mealPlanEntries.day, from, to)))
      .run();
    for (const entry of entries)
      tx.insert(mealPlanEntries)
        .values({ ...entry, userId, createdAt })
        .run();
    return true;
  });
}

/** Varene (nøklene) brukeren har krysset av i handlelisten for uka som starter på `week`. */
export function listWeekChecks(db: Db, userId: number, week: string): string[] {
  return db
    .select({ key: weekChecks.itemKey })
    .from(weekChecks)
    .where(and(eq(weekChecks.userId, userId), eq(weekChecks.week, week)))
    .orderBy(asc(weekChecks.id))
    .all()
    .map((row) => row.key);
}

/** Krysser av eller fjerner avkrysningen for en vare i uka. Å krysse av to ganger gir én rad. */
export function setWeekCheck(
  db: Db,
  userId: number,
  week: string,
  itemKey: string,
  checked: boolean,
): void {
  if (checked) {
    db.insert(weekChecks).values({ userId, week, itemKey }).onConflictDoNothing().run();
  } else {
    db.delete(weekChecks)
      .where(
        and(
          eq(weekChecks.userId, userId),
          eq(weekChecks.week, week),
          eq(weekChecks.itemKey, itemKey),
        ),
      )
      .run();
  }
}
