import "server-only";
import { cleanPantryName, pantryNameKey } from "@/lib/pantry-name";
import { isSelectedServings } from "@/lib/recipe-input";
import { appError, err, ok, type Result } from "@/lib/result";
import { getDb, type Db } from "../db/client";
import {
  countShoppingLists,
  deleteShoppingListRow,
  findShoppingList,
  listShoppingLists,
  saveShoppingListRow,
  type SavedList,
  type SavedListSummary,
} from "../db/repositories/shopping-list-repository";

export type { SavedList, SavedListSummary };

/** Lengste navn på en lagret handleliste. */
export const LIST_NAME_MAX_LENGTH = 60;
/** Flest oppskrifter i én liste (samme tak som handlelisten ellers). */
export const LIST_RECIPES_MAX = 50;
/** Flest lagrede lister per bruker. */
export const SAVED_LISTS_MAX = 50;

/** Brukerens lagrede handlelister, sist lagret først (Story 6.4g). */
export function listSavedLists(userId: number, db: Db = getDb()): Result<SavedListSummary[]> {
  return ok(listShoppingLists(db, userId));
}

/** Én lagret liste, eller `not_found` (ukjent id eller en annens liste). */
export function getSavedList(userId: number, id: unknown, db: Db = getDb()): Result<SavedList> {
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 1)
    return err(appError("not_found"));
  const list = findShoppingList(db, userId, id);
  return list ? ok(list) : err(appError("not_found"));
}

/**
 * Lagrer valgte oppskrifter med porsjoner under et navn. Samme navn (uavhengig av store og små
 * bokstaver) erstatter den som finnes. Tomt eller for langt navn (`name_required`, `name_too_long`),
 * ingen eller for mange oppskrifter (`items`), ugyldig antall (`servings`) og for mange lister
 * (`limit`) gir `validation`; en oppskrift som ikke er brukerens lagrede gir `not_found`.
 */
export function saveSavedList(
  userId: number,
  name: unknown,
  items: unknown,
  db: Db = getDb(),
  now: () => Date = () => new Date(),
): Result<{ id: number }> {
  if (typeof name !== "string") return err(appError("validation", "name_required"));
  const clean = cleanPantryName(name);
  if (clean === "") return err(appError("validation", "name_required"));
  if (clean.length > LIST_NAME_MAX_LENGTH) return err(appError("validation", "name_too_long"));
  if (!Array.isArray(items) || items.length === 0 || items.length > LIST_RECIPES_MAX)
    return err(appError("validation", "items"));
  const seen = new Set<number>();
  const cleanItems: { recipeId: number; servings: number }[] = [];
  for (const item of items as Record<string, unknown>[]) {
    if (typeof item !== "object" || item === null) return err(appError("validation", "items"));
    const { recipeId, servings } = item;
    if (typeof recipeId !== "number" || !Number.isSafeInteger(recipeId) || recipeId < 1)
      return err(appError("not_found"));
    if (!isSelectedServings(servings)) return err(appError("validation", "servings"));
    if (seen.has(recipeId)) return err(appError("validation", "items"));
    seen.add(recipeId);
    cleanItems.push({ recipeId, servings });
  }
  const key = pantryNameKey(clean);
  const exists = listShoppingLists(db, userId).some((list) => pantryNameKey(list.name) === key);
  if (!exists && countShoppingLists(db, userId) >= SAVED_LISTS_MAX)
    return err(appError("validation", "limit"));
  const id = saveShoppingListRow(db, userId, clean, key, cleanItems, now().toISOString());
  return id === null ? err(appError("not_found")) : ok({ id });
}

/** Sletter en lagret handleliste. Ukjent id eller en annens liste gir `not_found`. */
export function removeSavedList(
  userId: number,
  id: unknown,
  db: Db = getDb(),
): Result<{ id: number }> {
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 1)
    return err(appError("not_found"));
  return deleteShoppingListRow(db, userId, id) ? ok({ id }) : err(appError("not_found"));
}
