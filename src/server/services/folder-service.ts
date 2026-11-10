import "server-only";
import type { Folder, FolderSummary, RecipeSummary } from "@/domain";
import {
  cleanFolderName,
  FOLDER_NAME_MAX_LENGTH,
  folderNameKey,
  folderNameLength,
} from "@/lib/folder-name";
import { appError, err, ok, type Result } from "@/lib/result";
import { getDb, type Db } from "../db/client";
import {
  assignRecipeToFolder,
  assignRecipeToNewFolder,
  deleteFolder as deleteFolderRow,
  findFolderById,
  findFolderByNameKey,
  insertFolder,
  listFolders as listFolderRows,
  listRecipesInFolder,
  renameFolder as renameFolderRow,
} from "../db/repositories/folder-repository";

/** Feilkoder i `detail` når et mappenavn avvises (`validation`). */
export const FOLDER_NAME_ERRORS = ["name_required", "name_too_long", "name_taken"] as const;
export type FolderNameError = (typeof FOLDER_NAME_ERRORS)[number];

function isId(id: number): boolean {
  return Number.isSafeInteger(id) && id >= 1;
}

type CleanName = { name: string; nameKey: string };

/**
 * Renser og validerer et navn: blanke tegn slås sammen, 1–40 Unicode-tegn, og unikt på
 * `nameKey`. `ownId` er mappen som får nytt navn (den kan beholde sitt eget navn med andre
 * store og små bokstaver).
 */
function checkName(db: Db, userId: number, raw: string, ownId?: number): Result<CleanName> {
  const name = cleanFolderName(typeof raw === "string" ? raw : "");
  if (name === "") return err(appError("validation", "name_required"));
  if (folderNameLength(name) > FOLDER_NAME_MAX_LENGTH) {
    return err(appError("validation", "name_too_long"));
  }
  const nameKey = folderNameKey(name);
  const existing = findFolderByNameKey(db, userId, nameKey);
  if (existing && existing.id !== ownId) return err(appError("validation", "name_taken"));
  return ok({ name, nameKey });
}

/**
 * Oppretter en mappe for brukeren. Ugyldig eller opptatt navn (blant brukerens mapper) gir
 * `validation` med årsak i `detail`.
 */
export function createFolder(userId: number, name: string, db: Db = getDb()): Result<Folder> {
  const checked = checkName(db, userId, name);
  if (!checked.ok) return checked;
  const id = insertFolder(db, { ...checked.value, createdAt: new Date().toISOString(), userId });
  return ok({ id, name: checked.value.name });
}

/** Gir mappen nytt navn. Ukjent id gir `not_found`; ellers samme regler som `createFolder`. */
export function renameFolder(
  userId: number,
  id: number,
  name: string,
  db: Db = getDb(),
): Result<Folder> {
  if (!isId(id) || !findFolderById(db, userId, id)) return err(appError("not_found"));
  const checked = checkName(db, userId, name, id);
  if (!checked.ok) return checked;
  if (!renameFolderRow(db, userId, id, checked.value)) return err(appError("not_found"));
  return ok({ id, name: checked.value.name });
}

/** Sletter mappen; oppskriftene blir liggende i samlingen uten mappe. Ukjent id gir `not_found`. */
export function deleteFolder(userId: number, id: number, db: Db = getDb()): Result<{ id: number }> {
  if (!isId(id)) return err(appError("not_found"));
  return deleteFolderRow(db, userId, id) ? ok({ id }) : err(appError("not_found"));
}

const collator = new Intl.Collator("nb");

/** Brukerens mapper med antall oppskrifter, sortert alfabetisk (norsk). Alle mappefunksjoner gjelder bare brukerens egne mapper og oppskrifter (Story 5.13); andres gir `not_found`. */
export function listFolders(userId: number, db: Db = getDb()): Result<FolderSummary[]> {
  const folders = listFolderRows(db, userId).sort(
    (a, b) => collator.compare(a.name, b.name) || a.id - b.id,
  );
  return ok(folders);
}

/** Mappen med oppskriftene i den (sist lagret først). Ukjent id gir `not_found`. */
export function getFolderWithRecipes(
  userId: number,
  id: number,
  db: Db = getDb(),
): Result<{ folder: Folder; recipes: RecipeSummary[] }> {
  if (!isId(id)) return err(appError("not_found"));
  const folder = findFolderById(db, userId, id);
  if (!folder) return err(appError("not_found"));
  return ok({ folder, recipes: listRecipesInFolder(db, userId, id) });
}

/**
 * Legger en lagret oppskrift i en mappe, eller tar den ut av mappen med `null`. Ukjent
 * mappe, ukjent oppskrift og oppskrift som ikke er i samlingen gir `not_found`.
 */
export function moveRecipeToFolder(
  userId: number,
  recipeId: number,
  folderId: number | null,
  db: Db = getDb(),
): Result<{ folder: Folder | null }> {
  if (!isId(recipeId)) return err(appError("not_found"));
  let folder: Folder | null = null;
  if (folderId !== null) {
    if (!isId(folderId)) return err(appError("not_found"));
    folder = findFolderById(db, userId, folderId);
    if (!folder) return err(appError("not_found"));
  }
  return assignRecipeToFolder(db, userId, recipeId, folderId)
    ? ok({ folder })
    : err(appError("not_found"));
}

/**
 * Oppretter en mappe og legger en lagret oppskrift i den, i én transaksjon. Navnet valideres
 * som i `createFolder`; er oppskriften ukjent eller ikke lagret, opprettes ingen mappe.
 */
export function moveRecipeToNewFolder(
  userId: number,
  recipeId: number,
  name: string,
  db: Db = getDb(),
): Result<{ folder: Folder }> {
  if (!isId(recipeId)) return err(appError("not_found"));
  const checked = checkName(db, userId, name);
  if (!checked.ok) return checked;
  const id = assignRecipeToNewFolder(db, recipeId, {
    ...checked.value,
    createdAt: new Date().toISOString(),
    userId,
  });
  return id === null
    ? err(appError("not_found"))
    : ok({ folder: { id, name: checked.value.name } });
}
