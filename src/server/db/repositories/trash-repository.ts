import "server-only";
import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { z } from "zod";
import type { UnitKey } from "@/domain";
import type { Db } from "../client";
import {
  deletedRecipes,
  folders,
  cookedLog,
  ingredientLines,
  mealPlanEntries,
  recipeLabels,
  recipes,
  shoppingListItems,
  shoppingLists,
  steps,
  suggestions,
} from "../schema";
import { insertRecipeRows } from "./recipe-repository";

/**
 * Nylig slettede oppskrifter (Story 6.11). Ved sletting skrives et øyeblikksbilde (JSON) til
 * `deleted_recipes`, og oppskriften slettes som før. Ved gjenoppretting settes oppskriften inn
 * igjen fra bildet (med ny id), og bildet slettes. Resten av appen kjenner ikke til søpla.
 */

const lineSchema = z.object({
  position: z.number(),
  section: z.string().nullable(),
  original: z.string(),
  quantityMin: z.number().nullable(),
  quantityMax: z.number().nullable(),
  unit: z.string().nullable(),
  name: z.string(),
  parseable: z.boolean(),
});

const snapshotSchema = z.object({
  title: z.string(),
  sourceUrl: z.string().nullable(),
  sourceName: z.string().nullable(),
  originalServings: z.number().nullable(),
  selectedServings: z.number().nullable(),
  savedAt: z.string().nullable(),
  isFavorite: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  totalMinutes: z.number().nullable(),
  notes: z.string().nullable(),
  fitsFor: z.string().nullable(),
  rating: z.number().nullable(),
  lastCookedAt: z.string().nullable(),
  cookedCount: z.number(),
  folderId: z.number().nullable(),
  ingredients: z.array(lineSchema),
  steps: z.array(
    z.object({ position: z.number(), section: z.string().nullable(), text: z.string() }),
  ),
  labels: z.array(z.object({ label: z.string(), labelKey: z.string() })),
  suggestions: z.array(
    z.object({
      text: z.string(),
      reason: z.string(),
      appliesTo: z.string(),
      createdAt: z.string(),
    }),
  ),
  mealPlan: z.array(z.object({ day: z.string(), servings: z.number(), createdAt: z.string() })),
  shoppingLists: z.array(z.object({ listId: z.number(), servings: z.number() })),
});

type Snapshot = z.infer<typeof snapshotSchema>;

/** En slettet oppskrift i listen: tittel og når den ble slettet. */
export type DeletedRecipeRow = { id: number; title: string; deletedAt: string };

/**
 * Lagrer et øyeblikksbilde av en lagret oppskrift og sletter den, i én transaksjon. Returnerer id
 * i søpla, eller `null` når oppskriften ikke finnes, ikke er lagret eller ikke har eier (da
 * slettes den ikke her).
 */
export function trashRecipe(db: Db, id: number, now: string): number | null {
  return db.transaction((tx) => {
    const row = tx.select().from(recipes).where(eq(recipes.id, id)).get();
    if (!row || row.savedAt === null || row.userId === null) return null;

    const snapshot: Snapshot = {
      title: row.title,
      sourceUrl: row.sourceUrl,
      sourceName: row.sourceName,
      originalServings: row.originalServings,
      selectedServings: row.selectedServings,
      savedAt: row.savedAt,
      isFavorite: row.isFavorite,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      totalMinutes: row.totalMinutes,
      notes: row.notes,
      fitsFor: row.fitsFor,
      rating: row.rating,
      lastCookedAt: row.lastCookedAt,
      cookedCount: row.cookedCount,
      folderId: row.folderId,
      ingredients: tx
        .select()
        .from(ingredientLines)
        .where(eq(ingredientLines.recipeId, id))
        .orderBy(asc(ingredientLines.position), asc(ingredientLines.id))
        .all()
        .map((line) => ({
          position: line.position,
          section: line.section,
          original: line.originalText,
          quantityMin: line.quantityMin,
          quantityMax: line.quantityMax,
          unit: line.unit,
          name: line.name,
          parseable: line.parseable,
        })),
      steps: tx
        .select()
        .from(steps)
        .where(eq(steps.recipeId, id))
        .orderBy(asc(steps.position), asc(steps.id))
        .all()
        .map((step) => ({ position: step.position, section: step.section, text: step.text })),
      labels: tx
        .select({ label: recipeLabels.label, labelKey: recipeLabels.labelKey })
        .from(recipeLabels)
        .where(eq(recipeLabels.recipeId, id))
        .orderBy(asc(recipeLabels.id))
        .all(),
      suggestions: tx
        .select({
          text: suggestions.text,
          reason: suggestions.reason,
          appliesTo: suggestions.appliesTo,
          createdAt: suggestions.createdAt,
        })
        .from(suggestions)
        .where(eq(suggestions.recipeId, id))
        .orderBy(asc(suggestions.id))
        .all(),
      mealPlan: tx
        .select({
          day: mealPlanEntries.day,
          servings: mealPlanEntries.servings,
          createdAt: mealPlanEntries.createdAt,
        })
        .from(mealPlanEntries)
        .where(eq(mealPlanEntries.recipeId, id))
        .orderBy(asc(mealPlanEntries.id))
        .all(),
      shoppingLists: tx
        .select({ listId: shoppingListItems.listId, servings: shoppingListItems.servings })
        .from(shoppingListItems)
        .where(eq(shoppingListItems.recipeId, id))
        .all(),
    };

    const { id: trashId } = tx
      .insert(deletedRecipes)
      .values({
        userId: row.userId,
        title: row.title,
        deletedAt: now,
        snapshot: JSON.stringify(snapshot),
      })
      .returning({ id: deletedRecipes.id })
      .get();
    tx.delete(recipes).where(eq(recipes.id, id)).run();
    return trashId;
  });
}

/** Slettede oppskrifter for en bruker som ble slettet `since` eller senere, nyeste først. */
export function listDeletedRecipes(db: Db, userId: number, since: string): DeletedRecipeRow[] {
  return db
    .select({
      id: deletedRecipes.id,
      title: deletedRecipes.title,
      deletedAt: deletedRecipes.deletedAt,
    })
    .from(deletedRecipes)
    .where(and(eq(deletedRecipes.userId, userId), gte(deletedRecipes.deletedAt, since)))
    .orderBy(desc(deletedRecipes.deletedAt), desc(deletedRecipes.id))
    .all();
}

/** Én slettet oppskrift for eieren, eller `null` (ukjent, en annens eller for gammel). */
export function findDeletedRecipe(
  db: Db,
  userId: number,
  trashId: number,
  since: string,
): DeletedRecipeRow | null {
  return (
    db
      .select({
        id: deletedRecipes.id,
        title: deletedRecipes.title,
        deletedAt: deletedRecipes.deletedAt,
      })
      .from(deletedRecipes)
      .where(
        and(
          eq(deletedRecipes.id, trashId),
          eq(deletedRecipes.userId, userId),
          gte(deletedRecipes.deletedAt, since),
        ),
      )
      .get() ?? null
  );
}

/**
 * Setter oppskriften inn igjen fra øyeblikksbildet, med ny id, og sletter bildet, i én
 * transaksjon. Mappen, plassene i ukemenyen og handlelistene kommer tilbake så langt de finnes
 * (en slettet mappe eller liste hoppes over). Returnerer ny id, eller `null` når den ikke finnes,
 * ikke er din, er for gammel eller bildet er ødelagt (da endres ingenting).
 */
export function restoreRecipe(
  db: Db,
  userId: number,
  trashId: number,
  since: string,
): number | null {
  return db.transaction((tx) => {
    const trashed = tx
      .select()
      .from(deletedRecipes)
      .where(
        and(
          eq(deletedRecipes.id, trashId),
          eq(deletedRecipes.userId, userId),
          gte(deletedRecipes.deletedAt, since),
        ),
      )
      .get();
    if (!trashed) return null;

    let data: Snapshot;
    try {
      data = snapshotSchema.parse(JSON.parse(trashed.snapshot));
    } catch {
      return null;
    }

    const newId = insertRecipeRows(tx, {
      title: data.title,
      sourceUrl: data.sourceUrl,
      sourceName: data.sourceName,
      originalServings: data.originalServings,
      selectedServings: data.selectedServings,
      savedAt: data.savedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      userId,
      totalMinutes: data.totalMinutes,
      ingredients: data.ingredients.map((line) => ({
        position: line.position,
        section: line.section,
        original: line.original,
        quantity:
          line.quantityMin === null
            ? null
            : { min: line.quantityMin, max: line.quantityMax ?? line.quantityMin },
        unit: line.unit as UnitKey | null,
        name: line.name,
        parseable: line.parseable,
      })),
      steps: data.steps,
    });

    const folderStillExists =
      data.folderId !== null &&
      tx
        .select({ id: folders.id })
        .from(folders)
        .where(and(eq(folders.id, data.folderId), eq(folders.userId, userId)))
        .get() !== undefined;
    tx.update(recipes)
      .set({
        isFavorite: data.isFavorite,
        notes: data.notes,
        fitsFor: data.fitsFor,
        rating: data.rating,
        lastCookedAt: data.lastCookedAt,
        cookedCount: data.cookedCount,
        folderId: folderStillExists ? data.folderId : null,
      })
      .where(eq(recipes.id, newId))
      .run();

    if (data.cookedCount > 0 && data.lastCookedAt !== null)
      tx.insert(cookedLog).values({ recipeId: newId, cookedAt: data.lastCookedAt }).run();
    if (data.labels.length > 0)
      tx.insert(recipeLabels)
        .values(data.labels.map((label) => ({ recipeId: newId, ...label })))
        .run();
    if (data.suggestions.length > 0)
      tx.insert(suggestions)
        .values(data.suggestions.map((suggestion) => ({ recipeId: newId, ...suggestion })))
        .run();
    if (data.mealPlan.length > 0)
      tx.insert(mealPlanEntries)
        .values(data.mealPlan.map((entry) => ({ recipeId: newId, userId, ...entry })))
        .run();
    for (const item of data.shoppingLists) {
      const list = tx
        .select({ id: shoppingLists.id })
        .from(shoppingLists)
        .where(and(eq(shoppingLists.id, item.listId), eq(shoppingLists.userId, userId)))
        .get();
      if (list)
        tx.insert(shoppingListItems)
          .values({ listId: list.id, recipeId: newId, servings: item.servings })
          .onConflictDoNothing()
          .run();
    }

    tx.delete(deletedRecipes).where(eq(deletedRecipes.id, trashId)).run();
    return newId;
  });
}

/** Sletter en slettet oppskrift for godt (eieren velger det). `false` når den ikke finnes. */
export function deleteTrashed(db: Db, userId: number, trashId: number): boolean {
  return (
    db
      .delete(deletedRecipes)
      .where(and(eq(deletedRecipes.id, trashId), eq(deletedRecipes.userId, userId)))
      .run().changes > 0
  );
}

/** Sletter slettede oppskrifter eldre enn `cutoff` (ISO-tekst). Returnerer antall. */
export function purgeTrash(db: Db, cutoff: string): number {
  return db.delete(deletedRecipes).where(lt(deletedRecipes.deletedAt, cutoff)).run().changes;
}
