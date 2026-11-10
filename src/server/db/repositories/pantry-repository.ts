import "server-only";
import { asc, eq } from "drizzle-orm";
import type { PantryItem } from "@/domain";
import type { Db } from "../client";
import { pantryItems } from "../schema";

/** Alt brukeren har hjemme, sortert på navn (norsk rekkefølge) og så id. */
export function listPantryItems(db: Db): PantryItem[] {
  return db
    .select({ id: pantryItems.id, name: pantryItems.name })
    .from(pantryItems)
    .orderBy(asc(pantryItems.nameKey), asc(pantryItems.id))
    .all();
}

/**
 * Legger til noe man har hjemme. Samme navn (etter normalisering) to ganger gir den
 * eksisterende raden, uten ny rad og uten å endre navnet.
 */
export function insertPantryItem(
  db: Db,
  name: string,
  nameKey: string,
  createdAt: string,
): PantryItem {
  return db.transaction((tx) => {
    tx.insert(pantryItems).values({ name, nameKey, createdAt }).onConflictDoNothing().run();
    const row = tx
      .select({ id: pantryItems.id, name: pantryItems.name })
      .from(pantryItems)
      .where(eq(pantryItems.nameKey, nameKey))
      .get();
    // Raden finnes alltid: den ble lagt inn nå, eller fantes fra før (unik nøkkel).
    return row as PantryItem;
  });
}

/** Fjerner noe fra «har hjemme». Returnerer `false` når id-en ikke finnes. */
export function deletePantryItem(db: Db, id: number): boolean {
  return db.delete(pantryItems).where(eq(pantryItems.id, id)).run().changes > 0;
}
