import "server-only";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import type { Db } from "../client";
import { folders, ingredientLines, recipeLabels, recipes, steps } from "../schema";
import { insertRecipeRows, type NewRecipe } from "./recipe-repository";

/**
 * Sikkerhetskopi (Story 6.15): leser en brukers lagrede oppskrifter i et format uten id-er, og
 * setter slike oppskrifter inn igjen. Mappe og merkelapper går på navn, ikke på id.
 */

/** En lagret oppskrift slik den eksporteres. */
export type ExportedRecipe = {
  title: string;
  sourceUrl: string | null;
  sourceName: string | null;
  originalServings: number | null;
  totalMinutes: number | null;
  isFavorite: boolean;
  notes: string | null;
  fitsFor: string | null;
  rating: number | null;
  cookedCount: number;
  lastCookedAt: string | null;
  folder: string | null;
  labels: string[];
  ingredients: { section: string | null; text: string }[];
  steps: { section: string | null; text: string }[];
};

/** Alle brukerens lagrede oppskrifter, eldste først. */
export function readRecipesForExport(db: Db, userId: number): ExportedRecipe[] {
  const rows = db
    .select({ recipe: recipes, folderName: folders.name })
    .from(recipes)
    .leftJoin(folders, eq(folders.id, recipes.folderId))
    .where(and(eq(recipes.userId, userId), isNotNull(recipes.savedAt)))
    .orderBy(asc(recipes.id))
    .all();
  return rows.map(({ recipe, folderName }) => ({
    title: recipe.title,
    sourceUrl: recipe.sourceUrl,
    sourceName: recipe.sourceName,
    originalServings: recipe.originalServings,
    totalMinutes: recipe.totalMinutes,
    isFavorite: recipe.isFavorite,
    notes: recipe.notes,
    fitsFor: recipe.fitsFor,
    rating: recipe.rating,
    cookedCount: recipe.cookedCount,
    lastCookedAt: recipe.lastCookedAt,
    folder: folderName,
    labels: db
      .select({ label: recipeLabels.label })
      .from(recipeLabels)
      .where(eq(recipeLabels.recipeId, recipe.id))
      .orderBy(asc(recipeLabels.id))
      .all()
      .map((row) => row.label),
    ingredients: db
      .select({ section: ingredientLines.section, text: ingredientLines.originalText })
      .from(ingredientLines)
      .where(eq(ingredientLines.recipeId, recipe.id))
      .orderBy(asc(ingredientLines.position), asc(ingredientLines.id))
      .all(),
    steps: db
      .select({ section: steps.section, text: steps.text })
      .from(steps)
      .where(eq(steps.recipeId, recipe.id))
      .orderBy(asc(steps.position), asc(steps.id))
      .all(),
  }));
}

/** En oppskrift klar til å settes inn: innholdet og det som ligger utenfor `NewRecipe`. */
export type ImportItem = {
  recipe: NewRecipe;
  isFavorite: boolean;
  notes: string | null;
  fitsFor: string | null;
  rating: number | null;
  cookedCount: number;
  lastCookedAt: string | null;
  folder: { name: string; nameKey: string } | null;
  labels: { label: string; labelKey: string }[];
};

/**
 * Setter inn oppskriftene i én transaksjon (alt eller ingenting). En oppskrift med samme tittel
 * og samme kilde-adresse som en lagret oppskrift brukeren allerede har, hoppes over, så samme fil
 * kan importeres flere ganger uten dubletter. Mapper som mangler opprettes. Returnerer antall
 * satt inn og hoppet over.
 */
export function insertBackupItems(
  db: Db,
  userId: number,
  items: ImportItem[],
  now: string,
): { imported: number; skipped: number } {
  return db.transaction((tx) => {
    const existing = new Set(
      tx
        .select({ title: recipes.title, sourceUrl: recipes.sourceUrl })
        .from(recipes)
        .where(and(eq(recipes.userId, userId), isNotNull(recipes.savedAt)))
        .all()
        .map((row) => `${row.title}\u0000${row.sourceUrl ?? ""}`),
    );
    const folderIds = new Map<string, number>();
    let imported = 0;
    let skipped = 0;

    for (const item of items) {
      const duplicateKey = `${item.recipe.title}\u0000${item.recipe.sourceUrl ?? ""}`;
      if (existing.has(duplicateKey)) {
        skipped += 1;
        continue;
      }
      existing.add(duplicateKey);

      let folderId: number | null = null;
      if (item.folder !== null) {
        const known = folderIds.get(item.folder.nameKey);
        if (known !== undefined) {
          folderId = known;
        } else {
          const found = tx
            .select({ id: folders.id })
            .from(folders)
            .where(and(eq(folders.userId, userId), eq(folders.nameKey, item.folder.nameKey)))
            .get();
          folderId =
            found?.id ??
            tx
              .insert(folders)
              .values({
                name: item.folder.name,
                nameKey: item.folder.nameKey,
                createdAt: now,
                userId,
              })
              .returning({ id: folders.id })
              .get().id;
          folderIds.set(item.folder.nameKey, folderId);
        }
      }

      const id = insertRecipeRows(tx, { ...item.recipe, userId });
      tx.update(recipes)
        .set({
          isFavorite: item.isFavorite,
          notes: item.notes,
          fitsFor: item.fitsFor,
          rating: item.rating,
          cookedCount: item.cookedCount,
          lastCookedAt: item.lastCookedAt,
          folderId,
        })
        .where(eq(recipes.id, id))
        .run();
      if (item.labels.length > 0)
        tx.insert(recipeLabels)
          .values(item.labels.map((label) => ({ recipeId: id, ...label })))
          .run();
      imported += 1;
    }
    return { imported, skipped };
  });
}
