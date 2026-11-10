import "server-only";
import { and, asc, eq } from "drizzle-orm";
import type { PantryItem } from "@/domain";
import type { Db } from "../client";
import { pantryItems } from "../schema";

/** Alt brukeren har hjemme (Story 5.13: bare egne), sortert på navn (norsk rekkefølge) og så id. */
export function listPantryItems(db: Db, userId: number): PantryItem[] {
  return db
    .select({ id: pantryItems.id, name: pantryItems.name })
    .from(pantryItems)
    .where(eq(pantryItems.userId, userId))
    .orderBy(asc(pantryItems.nameKey), asc(pantryItems.id))
    .all();
}

/**
 * Legger til noe man har hjemme. Samme navn (etter normalisering) to ganger gir den
 * eksisterende raden, uten ny rad og uten å endre navnet.
 */
export function insertPantryItem(
  db: Db,
  userId: number,
  name: string,
  nameKey: string,
  createdAt: string,
): PantryItem {
  return db.transaction((tx) => {
    tx.insert(pantryItems).values({ name, nameKey, createdAt, userId }).onConflictDoNothing().run();
    const row = tx
      .select({ id: pantryItems.id, name: pantryItems.name })
      .from(pantryItems)
      .where(and(eq(pantryItems.nameKey, nameKey), eq(pantryItems.userId, userId)))
      .get();
    // Raden finnes alltid: den ble lagt inn nå, eller fantes fra før (unik nøkkel).
    return row as PantryItem;
  });
}

/** Fjerner noe fra «har hjemme». Returnerer `false` når id-en ikke finnes. */
export function deletePantryItem(db: Db, userId: number, id: number): boolean {
  return (
    db
      .delete(pantryItems)
      .where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)))
      .run().changes > 0
  );
}
