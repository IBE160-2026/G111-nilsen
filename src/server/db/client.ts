import "server-only";
import { config } from "../config";
import { MEMORY_DATABASE, openDatabase, type Db } from "./migrate";

export type { Db } from "./migrate";

/**
 * Databasetilkoblingen åpnes lat: første gang `getDb()` kalles i en forespørsel,
 * aldri ved import eller under `next build`. Tilkoblingen lagres på `globalThis`,
 * slik at den overlever hot reload i utvikling og gjenbrukes mellom forespørsler.
 */
const globalForDb = globalThis as typeof globalThis & { __recipemateDb?: Db };

export function getDb(): Db {
  globalForDb.__recipemateDb ??= openDatabase(config.databasePath);
  return globalForDb.__recipemateDb;
}

/** Ny, tom database i minnet med alle migrasjoner kjørt. Brukes i tester. */
export function createTestDb(): Db {
  return openDatabase(MEMORY_DATABASE);
}
