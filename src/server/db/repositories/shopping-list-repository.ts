import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import type { Db } from "../client";
import { recipes, shoppingListItems, shoppingLists } from "../schema";

export type SavedListSummary = { id: number; name: string; recipes: number };
export type SavedList = {
  id: number;
  name: string;
  items: { recipeId: number; servings: number }[];
};

/** Brukerens lagrede handlelister med antall oppskrifter, sist lagret først. */
export function listShoppingLists(db: Db, userId: number): SavedListSummary[] {
  return db
    .select({
      id: shoppingLists.id,
      name: shoppingLists.name,
      recipes: sql<number>`(select count(*) from shopping_list_items where shopping_list_items.list_id = shopping_lists.id)`,
    })
    .from(shoppingLists)
    .where(eq(shoppingLists.userId, userId))
    .orderBy(desc(shoppingLists.updatedAt), desc(shoppingLists.id))
    .all();
}

/** Én lagret liste med oppskriftene i den, eller `null` (ukjent id eller en annens liste). */
export function findShoppingList(db: Db, userId: number, id: number): SavedList | null {
  const list = db
    .select({ id: shoppingLists.id, name: shoppingLists.name })
    .from(shoppingLists)
    .where(and(eq(shoppingLists.id, id), eq(shoppingLists.userId, userId)))
    .get();
  if (!list) return null;
  const items = db
    .select({ recipeId: shoppingListItems.recipeId, servings: shoppingListItems.servings })
    .from(shoppingListItems)
    .where(eq(shoppingListItems.listId, id))
    .orderBy(asc(shoppingListItems.id))
    .all();
  return { ...list, items };
}

export function countShoppingLists(db: Db, userId: number): number {
  return db
    .select({ n: sql<number>`count(*)` })
    .from(shoppingLists)
    .where(eq(shoppingLists.userId, userId))
    .get()!.n;
}

/**
 * Lagrer en liste under `nameKey`: finnes den fra før, erstattes oppskriftene og navnet; ellers
 * lages den. Alt i én transaksjon. Gir `null` når en oppskrift ikke er brukerens lagrede, og da
 * endres ingenting; ellers listens id.
 */
export function saveShoppingListRow(
  db: Db,
  userId: number,
  name: string,
  nameKey: string,
  items: readonly { recipeId: number; servings: number }[],
  now: string,
): number | null {
  return db.transaction((tx) => {
    const ids = items.map((item) => item.recipeId);
    const owned = tx
      .select({ id: recipes.id })
      .from(recipes)
      .where(and(eq(recipes.userId, userId), isNotNull(recipes.savedAt), inArray(recipes.id, ids)))
      .all();
    if (owned.length !== new Set(ids).size) return null;
    const existing = tx
      .select({ id: shoppingLists.id })
      .from(shoppingLists)
      .where(and(eq(shoppingLists.userId, userId), eq(shoppingLists.nameKey, nameKey)))
      .get();
    let listId: number;
    if (existing) {
      listId = existing.id;
      tx.update(shoppingLists)
        .set({ name, updatedAt: now })
        .where(eq(shoppingLists.id, listId))
        .run();
      tx.delete(shoppingListItems).where(eq(shoppingListItems.listId, listId)).run();
    } else {
      listId = tx
        .insert(shoppingLists)
        .values({ userId, name, nameKey, createdAt: now, updatedAt: now })
        .returning({ id: shoppingLists.id })
        .get().id;
    }
    for (const item of items)
      tx.insert(shoppingListItems)
        .values({ listId, recipeId: item.recipeId, servings: item.servings })
        .run();
    return listId;
  });
}

/** Sletter en av brukerens lister. `false` når den ikke finnes. */
export function deleteShoppingListRow(db: Db, userId: number, id: number): boolean {
  return (
    db
      .delete(shoppingLists)
      .where(and(eq(shoppingLists.id, id), eq(shoppingLists.userId, userId)))
      .run().changes > 0
  );
}
