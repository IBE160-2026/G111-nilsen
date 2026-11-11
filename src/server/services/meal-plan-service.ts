import "server-only";
import { addDays, isIsoDate, mondayOf } from "@/domain";
import { isSelectedServings, LIMITS } from "@/lib/recipe-input";
import { appError, err, ok, type Result } from "@/lib/result";
import { getDb, type Db } from "../db/client";
import {
  deleteEntry,
  insertEntry,
  listEntries,
  listPlannedDays,
  listPlannableRecipes,
  type MealPlanEntry,
  type PlannableRecipe,
} from "../db/repositories/meal-plan-repository";

export type { MealPlanEntry, PlannableRecipe };

/** Lagrede oppskrifter brukeren kan legge på en dag (Story 6.4). */
export function listPlannable(userId: number, db: Db = getDb()): Result<PlannableRecipe[]> {
  return ok(listPlannableRecipes(db, userId));
}

/** Dagens dato i norsk tid, «YYYY-MM-DD». */
export function todayInOslo(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Oslo" }).format(now);
}

/** Uka (mandag) for en `?uke=`-verdi, eller denne uka når verdien mangler eller er ugyldig. */
export function weekStart(raw: unknown, now: Date = new Date()): string {
  return mondayOf(isIsoDate(raw) ? raw : todayInOslo(now));
}

/** Brukerens ukemeny for uka som starter på `monday` (Story 6.4). */
export function listWeek(
  userId: number,
  monday: string,
  db: Db = getDb(),
): Result<MealPlanEntry[]> {
  if (!isIsoDate(monday)) return err(appError("validation", "day"));
  return ok(listEntries(db, userId, monday, addDays(monday, 6)));
}

/**
 * Legger en lagret oppskrift på en dag i ukemenyen. Ugyldig dag eller antall (hele og halve
 * 0,5–50) gir `validation`; ukjent, ulagret eller en annens oppskrift gir `not_found`.
 */
export function addToWeek(
  userId: number,
  recipeId: number,
  day: string,
  servings: number,
  db: Db = getDb(),
  now: () => Date = () => new Date(),
): Result<{ id: number }> {
  if (!isIsoDate(day)) return err(appError("validation", "day"));
  if (!isSelectedServings(servings)) return err(appError("validation", "servings"));
  if (!Number.isSafeInteger(recipeId) || recipeId < 1) return err(appError("not_found"));
  const id = insertEntry(db, {
    userId,
    recipeId,
    day,
    servings,
    createdAt: now().toISOString(),
  });
  return id === null ? err(appError("not_found")) : ok({ id });
}

/** Fjerner en oppføring fra brukerens ukemeny. Ukjent eller en annens gir `not_found`. */
export function removeFromWeek(
  userId: number,
  entryId: number,
  db: Db = getDb(),
): Result<{ id: number }> {
  if (!Number.isSafeInteger(entryId) || entryId < 1) return err(appError("not_found"));
  return deleteEntry(db, userId, entryId) ? ok({ id: entryId }) : err(appError("not_found"));
}

/**
 * Antall porsjoner per oppskrift for hele uka, til handlelisten: samme oppskrift flere dager
 * legges sammen. Summen holdes innenfor det handlelisten godtar (maks 50).
 */
export function weekShoppingSelection(entries: readonly MealPlanEntry[]): Record<number, number> {
  const selection: Record<number, number> = {};
  for (const entry of entries) {
    selection[entry.recipeId] = Math.min(
      LIMITS.servingsMax,
      (selection[entry.recipeId] ?? 0) + entry.servings,
    );
  }
  return selection;
}

/** En uke brukeren har planlagt noe i: mandagen og antall retter. */
export type PlannedWeek = { monday: string; meals: number };

/** Hvor mange uker «Dine uker» viser. */
export const PLANNED_WEEKS_LIMIT = 52;

/** Ukene brukeren har planlagt noe i (Story 6.4b), nyeste først, høyst ett år. */
export function listPlannedWeeks(userId: number, db: Db = getDb()): Result<PlannedWeek[]> {
  const weeks = new Map<string, number>();
  for (const { day, count } of listPlannedDays(db, userId)) {
    const monday = mondayOf(day);
    weeks.set(monday, (weeks.get(monday) ?? 0) + count);
  }
  return ok([...weeks].slice(0, PLANNED_WEEKS_LIMIT).map(([monday, meals]) => ({ monday, meals })));
}
