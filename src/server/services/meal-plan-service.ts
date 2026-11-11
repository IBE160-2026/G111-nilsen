import "server-only";
import { addDays, isIsoDate, mondayOf } from "@/domain";
import { isSelectedServings, LIMITS } from "@/lib/recipe-input";
import { appError, err, ok, type Result } from "@/lib/result";
import { getDb, type Db } from "../db/client";
import {
  insertEntry,
  replaceWeek,
  listEntries,
  listPlannedMeals,
  listWeekChecks,
  setWeekCheck,
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

/** Hvor mange oppføringer en uke kan ha. */
export const WEEK_ENTRIES_MAX = 100;

/**
 * Lagrer hele ukemenyen for uka som inneholder `week` (Story 6.4): alle oppføringene i uka erstattes
 * med `items`, så fjernede retter forsvinner og nye kommer til. Ugyldig dag (også en dag utenfor
 * uka), antall (hele og halve 0,5–50) eller for mange oppføringer gir `validation`; en ukjent,
 * ulagret eller annens oppskrift gir `not_found`, og da endres ingenting.
 */
export function saveWeek(
  userId: number,
  week: unknown,
  items: unknown,
  db: Db = getDb(),
  now: () => Date = () => new Date(),
): Result<{ count: number }> {
  if (!isIsoDate(week)) return err(appError("validation", "day"));
  if (!Array.isArray(items) || items.length > WEEK_ENTRIES_MAX)
    return err(appError("validation", "items"));
  const monday = mondayOf(week);
  const sunday = addDays(monday, 6);
  const clean: { recipeId: number; day: string; servings: number }[] = [];
  for (const item of items as Record<string, unknown>[]) {
    if (typeof item !== "object" || item === null) return err(appError("validation", "items"));
    const { recipeId, day, servings } = item;
    if (!isIsoDate(day) || day < monday || day > sunday) return err(appError("validation", "day"));
    if (!isSelectedServings(servings)) return err(appError("validation", "servings"));
    if (typeof recipeId !== "number" || !Number.isSafeInteger(recipeId) || recipeId < 1)
      return err(appError("not_found"));
    clean.push({ recipeId, day, servings });
  }
  return replaceWeek(db, userId, monday, sunday, clean, now().toISOString())
    ? ok({ count: clean.length })
    : err(appError("not_found"));
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

/** En uke brukeren har planlagt noe i: mandagen, antall retter og tittelene (uten gjentakelser, i dagsrekkefølge). */
export type PlannedWeek = { monday: string; meals: number; titles: string[] };

/** Hvor mange uker «Dine uker» viser. */
export const PLANNED_WEEKS_LIMIT = 52;

/** Ukene brukeren har planlagt noe i (Story 6.4b), nyeste først, høyst ett år. */
export function listPlannedWeeks(userId: number, db: Db = getDb()): Result<PlannedWeek[]> {
  const weeks = new Map<string, { day: string; title: string }[]>();
  for (const meal of listPlannedMeals(db, userId)) {
    const monday = mondayOf(meal.day);
    weeks.set(monday, [...(weeks.get(monday) ?? []), meal]);
  }
  return ok(
    [...weeks].slice(0, PLANNED_WEEKS_LIMIT).map(([monday, meals]) => ({
      monday,
      meals: meals.length,
      // Oppføringene kommer nyeste dag først; i uka vises de fra mandag.
      titles: [...new Set([...meals].reverse().map((meal) => meal.title))],
    })),
  );
}

/** Hvor lang en varenøkkel kan være (navn og enhet). */
export const CHECK_KEY_MAX_LENGTH = 200;

/** Varene brukeren har krysset av i handlelisten for en uke (Story 6.4c). Ugyldig dag gir `validation`. */
export function listChecks(userId: number, week: unknown, db: Db = getDb()): Result<string[]> {
  if (!isIsoDate(week)) return err(appError("validation", "day"));
  return ok(listWeekChecks(db, userId, mondayOf(week)));
}

/**
 * Krysser av (eller fjerner avkrysningen for) en vare i handlelisten for en uke. Dagen kan være
 * hvilken som helst dag i uka. Ugyldig dag eller nøkkel (tom eller over 200 tegn) gir `validation`.
 */
export function setCheck(
  userId: number,
  week: unknown,
  key: unknown,
  checked: unknown,
  db: Db = getDb(),
): Result<{ checked: boolean }> {
  if (!isIsoDate(week)) return err(appError("validation", "day"));
  if (typeof key !== "string" || key === "" || key.length > CHECK_KEY_MAX_LENGTH)
    return err(appError("validation", "key"));
  if (typeof checked !== "boolean") return err(appError("validation", "checked"));
  setWeekCheck(db, userId, mondayOf(week), key, checked);
  return ok({ checked });
}
