import "server-only";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import type { Folder, FolderSummary, RecipeSummary } from "@/domain";
import type { Db } from "../client";
import { folders, recipes } from "../schema";
import { listSavedRecipes } from "./recipe-repository";

/** En mappe klar til lagring: `nameKey` er det normaliserte navnet (unikt). */
export type NewFolder = { name: string; nameKey: string; createdAt: string; userId: number };

/**
 * Mappehandlinger rører aldri `recipes.updated_at`: avkrysning og valgt antall på
 * oppskriftssiden er nøklet på den, og en endring ville nullstilt dem.
 */

/** Oppretter mappen og returnerer id. Kaster ved brudd på unik `name_key`. */
export function insertFolder(db: Db, folder: NewFolder): number {
  return db.insert(folders).values(folder).returning({ id: folders.id }).get().id;
}

/** Mappen `id` hvis den tilhører `userId` (Story 5.13). */
function mine(userId: number, id: number) {
  return and(eq(folders.id, id), eq(folders.userId, userId));
}

/** Endrer navn og nøkkel. Returnerer `false` når id-en ikke finnes for brukeren. */
export function renameFolder(
  db: Db,
  userId: number,
  id: number,
  name: { name: string; nameKey: string },
): boolean {
  return db.update(folders).set(name).where(mine(userId, id)).run().changes > 0;
}

/**
 * Sletter mappen. Oppskriftene beholdes: `recipes.folder_id` settes til `NULL` av
 * `ON DELETE SET NULL` (fremmednøkler er slått på i `openDatabase`). Returnerer `false`
 * når id-en ikke finnes.
 */
export function deleteFolder(db: Db, userId: number, id: number): boolean {
  return db.delete(folders).where(mine(userId, id)).run().changes > 0;
}

/** Brukerens mappe med denne id-en, eller `null`. */
export function findFolderById(db: Db, userId: number, id: number): Folder | null {
  return (
    db.select({ id: folders.id, name: folders.name }).from(folders).where(mine(userId, id)).get() ??
    null
  );
}

/** Brukerens mappe med dette normaliserte navnet, eller `null`. */
export function findFolderByNameKey(db: Db, userId: number, nameKey: string): Folder | null {
  return (
    db
      .select({ id: folders.id, name: folders.name })
      .from(folders)
      .where(and(eq(folders.nameKey, nameKey), eq(folders.userId, userId)))
      .get() ?? null
  );
}

/** Brukerens mapper med antall oppskrifter i samlingen (0 for en tom mappe), sortert på id. */
export function listFolders(db: Db, userId: number): FolderSummary[] {
  return db
    .select({
      id: folders.id,
      name: folders.name,
      recipeCount: sql<number>`count(${recipes.id})`,
    })
    .from(folders)
    .leftJoin(recipes, and(eq(recipes.folderId, folders.id), isNotNull(recipes.savedAt)))
    .where(eq(folders.userId, userId))
    .groupBy(folders.id)
    .orderBy(folders.id)
    .all();
}

/** Oppskriftene i mappen, samme oppsummering og rekkefølge som samlingen. */
export function listRecipesInFolder(db: Db, userId: number, folderId: number): RecipeSummary[] {
  return listSavedRecipes(db, userId, folderId);
}

/**
 * Legger en lagret oppskrift i mappen, eller tar den ut av mappen med `null`. Returnerer
 * `false` når oppskriften ikke finnes, ikke er lagret eller er en annen brukers (ingenting endres).
 * Mappen må finnes og være brukerens (sjekkes i tjenesten).
 */
export function assignRecipeToFolder(
  db: Db,
  userId: number,
  recipeId: number,
  folderId: number | null,
): boolean {
  return (
    db
      .update(recipes)
      .set({ folderId })
      .where(and(eq(recipes.id, recipeId), isNotNull(recipes.savedAt), eq(recipes.userId, userId)))
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
  const userId = folder.userId;
  return db.transaction(
    (tx) => {
      const recipe = tx
        .select({ id: recipes.id })
        .from(recipes)
        .where(
          and(eq(recipes.id, recipeId), isNotNull(recipes.savedAt), eq(recipes.userId, userId)),
        )
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
