import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

/**
 * Åpning og migrering av databasen. Brukes både av `getDb()` i appen og av
 * `npm run db:migrate` (scripts/db-migrate.ts), så begge går gjennom samme kode.
 * Fila har bevisst ikke `server-only`, fordi migreringsskriptet kjører utenfor Next.
 */

export type Db = BetterSQLite3Database<typeof schema> & { $client: Database.Database };

export const MEMORY_DATABASE = ":memory:";

/** Migrasjonene ligger i `drizzle/` i prosjektroten. */
export function migrationsFolder(): string {
  return join(process.cwd(), "drizzle");
}

/** Kjører alle migrasjoner som ikke er kjørt ennå. Trygg å kalle flere ganger. */
export function runMigrations(db: Db): void {
  migrate(db, { migrationsFolder: migrationsFolder() });
}

/**
 * Åpner (og oppretter ved behov) databasefila, slår på WAL, `busy_timeout` og
 * fremmednøkler, og kjører migrasjonene. Mappen for fila opprettes hvis den mangler.
 */
export function openDatabase(path: string): Db {
  if (path !== MEMORY_DATABASE) {
    mkdirSync(dirname(resolve(path)), { recursive: true });
  }
  const sqlite = new Database(path);
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("foreign_keys = ON");
  if (path !== MEMORY_DATABASE) sqlite.pragma("journal_mode = WAL");

  const db = drizzle({ client: sqlite, schema });
  runMigrations(db);
  return db;
}
