import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "../config";
import { MEMORY_DATABASE, migrationsFolder, openDatabase, runMigrations, type Db } from "./migrate";

export type { Db } from "./migrate";

/**
 * Databasetilkoblingen åpnes lat: første gang `getDb()` kalles i en forespørsel,
 * aldri ved import eller under `next build`. Tilkoblingen lagres på `globalThis`,
 * slik at den overlever hot reload i utvikling og gjenbrukes mellom forespørsler.
 */
const globalForDb = globalThis as typeof globalThis & {
  __recipemateDb?: Db;
  __recipemateDbMigrations?: number;
};

/** Antall migrasjoner i `drizzle/meta/_journal.json`, eller -1 hvis journalen ikke kan leses. */
function journalMigrationCount(): number {
  try {
    const journal = JSON.parse(
      readFileSync(join(migrationsFolder(), "meta", "_journal.json"), "utf8"),
    ) as { entries?: unknown[] };
    return Array.isArray(journal.entries) ? journal.entries.length : -1;
  } catch {
    return -1;
  }
}

export function getDb(): Db {
  if (!globalForDb.__recipemateDb) {
    globalForDb.__recipemateDb = openDatabase(config.databasePath);
    globalForDb.__recipemateDbMigrations = journalMigrationCount();
    return globalForDb.__recipemateDb;
  }
  // I utvikling kan det komme nye migrasjoner mens dev-serveren går, og den
  // mellomlagrede tilkoblingen har da ikke fått dem (feil: «no such table»).
  // Vi kjører derfor migrasjonene på nytt når journalen har vokst. Trygt å gjenta.
  if (!config.isProduction) {
    const count = journalMigrationCount();
    if (count !== globalForDb.__recipemateDbMigrations) {
      runMigrations(globalForDb.__recipemateDb);
      globalForDb.__recipemateDbMigrations = count;
    }
  }
  return globalForDb.__recipemateDb;
}

/** Id-en til testbrukeren som `createTestDb` lager (Story 5.13). */
export const TEST_USER_ID = 1;

/**
 * Ny database i minnet med alle migrasjoner kjørt. Brukes i tester. Har som standard én bruker
 * (`TEST_USER_ID`, test@example.com), så eide oppskrifter, mapper og «Har hjemme» kan lages
 * direkte; `{ users: false }` gir en database helt uten brukere.
 */
export function createTestDb(options: { users?: boolean } = {}): Db {
  const db = openDatabase(MEMORY_DATABASE);
  if (options.users !== false) {
    db.$client
      .prepare(
        "insert into users (id, email, password_hash, created_at) values (?, 'test@example.com', 'x', '2026-01-01T00:00:00.000Z')",
      )
      .run(TEST_USER_ID);
  }
  return db;
}
