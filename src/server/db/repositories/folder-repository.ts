import "server-only";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import type { Folder, FolderSummary, RecipeSummary } from "@/domain";
import type { Db } from "../client";
import { folders, recipes } from "../schema";
import { listSavedRecipes } from "./recipe-repository";

/** En mappe klar til lagring: `nameKey` er det normaliserte navnet (unikt). */
export type NewFolder = { name: string; nameKey: string; createdAt: string };

/**
 * Mappehandlinger rører aldri `recipes.updated_at`: avkrysning og valgt antall på
 * oppskriftssiden er nøklet på den, og en endring ville nullstilt dem.
 */

/** Oppretter mappen og returnerer id. Kaster ved brudd på unik `name_key`. */
export function insertFolder(db: Db, folder: NewFolder): number {
  return db.insert(folders).values(folder).returning({ id: folders.id }).get().id;
}

/** Endrer navn og nøkkel. Returnerer `false` når id-en ikke finnes. */
export function renameFolder(db: Db, id: number, name: { name: string; nameKey: string }): boolean {
  return db.update(folders).set(name).where(eq(folders.id, id)).run().changes > 0;
}

/**
 * Sletter mappen. Oppskriftene beholdes: `recipes.folder_id` settes til `NULL` av
 * `ON DELETE SET NULL` (fremmednøkler er slått på i `openDatabase`). Returnerer `false`
 * når id-en ikke finnes.
 */
export function deleteFolder(db: Db, id: number): boolean {
  return db.delete(folders).where(eq(folders.id, id)).run().changes > 0;
}

export function findFolderById(db: Db, id: number): Folder | null {
  return (
    db
      .select({ id: folders.id, name: folders.name })
      .from(folders)
      .where(eq(folders.id, id))
      .get() ?? null
  );
}

/** Mappen med dette normaliserte navnet, eller `null`. */
export function findFolderByNameKey(db: Db, nameKey: string): Folder | null {
  return (
    db
      .select({ id: folders.id, name: folders.name })
      .from(folders)
      .where(eq(folders.nameKey, nameKey))
      .get() ?? null
  );
}

/** Alle mapper med antall oppskrifter i samlingen (0 for en tom mappe), sortert på id. */
export function listFolders(db: Db): FolderSummary[] {
  return db
    .select({
      id: folders.id,
      name: folders.name,
      recipeCount: sql<number>`count(${recipes.id})`,
    })
    .from(folders)
    .leftJoin(recipes, and(eq(recipes.folderId, folders.id), isNotNull(recipes.savedAt)))
    .groupBy(folders.id)
    .orderBy(folders.id)
    .all();
}

/** Oppskriftene i mappen, samme oppsummering og rekkefølge som samlingen. */
export function listRecipesInFolder(db: Db, folderId: number): RecipeSummary[] {
  return listSavedRecipes(db, folderId);
}

/**
 * Legger en lagret oppskrift i mappen, eller tar den ut av mappen med `null`. Returnerer
 * `false` når oppskriften ikke finnes eller ikke er lagret (ingenting endres). Mappen må finnes.
 */
export function assignRecipeToFolder(db: Db, recipeId: number, folderId: number | null): boolean {
  return (
    db
      .update(recipes)
      .set({ folderId })
      .where(and(eq(recipes.id, recipeId), isNotNull(recipes.savedAt)))
      .run().changes > 0
  );
}

/**
 * Oppretter mappen og flytter en lagret oppskrift dit, i én transaksjon: feiler noe, finnes
 * ingen ny mappe. Returnerer ny mappe-id, eller `null` når oppskriften ikke finnes eller ikke
 * er lagret (da opprettes ingen mappe).
 */
export function assignRecipeToNewFolder(
  db: Db,
  recipeId: number,
  folder: NewFolder,
): number | null {
  return db.transaction(
    (tx) => {
      const recipe = tx
        .select({ id: recipes.id })
        .from(recipes)
        .where(and(eq(recipes.id, recipeId), isNotNull(recipes.savedAt)))
        .get();
      if (!recipe) return null;

      const { id } = tx.insert(folders).values(folder).returning({ id: folders.id }).get();
      tx.update(recipes).set({ folderId: id }).where(eq(recipes.id, recipeId)).run();
      return id;
      // BEGIN IMMEDIATE tar skrivelåsen med en gang, så lesingen først ikke gir SQLITE_BUSY ved oppgradering.
    },
    { behavior: "immediate" },
  );
}
