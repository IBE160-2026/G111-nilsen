import "server-only";
import type { PantryItem } from "@/domain";
import { cleanPantryName, PANTRY_NAME_MAX_LENGTH, pantryNameKey } from "@/lib/pantry-name";
import { appError, err, ok, type Result } from "@/lib/result";
import { getDb, type Db } from "../db/client";
import {
  deleteAllPantryItems,
  deletePantryItem,
  insertPantryItem,
  listPantryItems,
} from "../db/repositories/pantry-repository";

/** Feilkoder i `detail` når et navn avvises (`validation`). */
export const PANTRY_NAME_ERRORS = ["name_required", "name_too_long"] as const;

/** Alt brukeren har hjemme (Story 5.8), sortert på navn. Hver bruker har sin egen liste (Story 5.13). */
export function listPantry(userId: number, db: Db = getDb()): Result<PantryItem[]> {
  return ok(listPantryItems(db, userId));
}

/**
 * Legger til noe man har hjemme. Tomt navn gir `validation` (`name_required`), over 60 tegn
 * `name_too_long`. Samme navn to ganger (uavhengig av store og små bokstaver) gir den som finnes.
 */
export function addPantryItem(
  userId: number,
  name: string,
  db: Db = getDb(),
  now: () => Date = () => new Date(),
): Result<PantryItem> {
  const clean = cleanPantryName(name);
  if (clean === "") return err(appError("validation", "name_required"));
  if (clean.length > PANTRY_NAME_MAX_LENGTH) return err(appError("validation", "name_too_long"));
  return ok(insertPantryItem(db, userId, clean, pantryNameKey(clean), now().toISOString()));
}

/** Tar noe ut av «har hjemme», så det kommer tilbake på handlelisten. Ukjent id gir `not_found`. */
export function removePantryItem(
  userId: number,
  id: number,
  db: Db = getDb(),
): Result<{ id: number }> {
  if (!Number.isSafeInteger(id) || id < 1) return err(appError("not_found"));
  return deletePantryItem(db, userId, id) ? ok({ id }) : err(appError("not_found"));
}

/** Tømmer «har hjemme» (etter en handletur), så alt kommer tilbake på handlelisten. */
export function clearPantry(userId: number, db: Db = getDb()): Result<{ removed: number }> {
  return ok({ removed: deleteAllPantryItems(db, userId) });
}
