import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MEMORY_DATABASE, migrationsFolder, openDatabase, runMigrations } from "./migrate";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tables(db: ReturnType<typeof openDatabase>): string[] {
  return (
    db.$client
      .prepare("select name from sqlite_master where type = 'table' order by name")
      .all() as { name: string }[]
  ).map((row) => row.name);
}

describe("openDatabase (Første oppstart)", () => {
  it("oppretter manglende mappe, databasefil og tabeller", () => {
    const dir = mkdtempSync(join(tmpdir(), "recipemate-"));
    dirs.push(dir);
    const path = join(dir, "finnes-ikke", "recipemate.db");

    const db = openDatabase(path);
    expect(existsSync(path)).toBe(true);
    expect(tables(db)).toEqual(expect.arrayContaining(["recipes", "ingredient_lines", "steps"]));
    expect(db.$client.pragma("journal_mode", { simple: true })).toBe("wal");
    expect(db.$client.pragma("foreign_keys", { simple: true })).toBe(1);
    expect(db.$client.pragma("busy_timeout", { simple: true })).toBe(5000);

    // Migrasjonene kan kjøres flere ganger, og data overlever ny åpning.
    runMigrations(db);
    db.$client
      .prepare("insert into recipes (title, created_at, updated_at) values ('A', 'x', 'x')")
      .run();
    db.$client.close();
    const reopened = openDatabase(path);
    expect(reopened.$client.prepare("select title from recipes").all()).toEqual([{ title: "A" }]);
    reopened.$client.close();
  });
});

describe("openDatabase ved feil", () => {
  it("lukker tilkoblingen og kaster videre når migreringen feiler", () => {
    const dir = mkdtempSync(join(tmpdir(), "recipemate-"));
    dirs.push(dir);
    const close = vi.spyOn(Database.prototype, "close");
    try {
      expect(() => openDatabase(join(dir, "x.db"), join(dir, "finnes-ikke"))).toThrow();
      expect(close).toHaveBeenCalledTimes(1);
    } finally {
      close.mockRestore();
    }
  });
});

describe("migrasjon 0001 (Story 3.1: manuelle oppskrifter i samlingen)", () => {
  /** En migrasjonsmappe med bare `0000`, slik databasen så ut før 0001. */
  function folderWithOnlyInit(): string {
    const dir = mkdtempSync(join(tmpdir(), "recipemate-"));
    dirs.push(dir);
    cpSync(
      join(migrationsFolder(), "meta", "0000_snapshot.json"),
      join(dir, "meta", "0000_snapshot.json"),
      {
        recursive: true,
      },
    );
    cpSync(join(migrationsFolder(), "0000_init.sql"), join(dir, "0000_init.sql"));
    const journal = JSON.parse(
      readFileSync(join(migrationsFolder(), "meta", "_journal.json"), "utf8"),
    ) as { entries: unknown[] };
    journal.entries = journal.entries.slice(0, 1);
    writeFileSync(join(dir, "meta", "_journal.json"), JSON.stringify(journal));
    return dir;
  }

  function insert(
    db: ReturnType<typeof openDatabase>,
    title: string,
    sourceUrl: string | null,
    savedAt: string | null,
  ): void {
    db.$client
      .prepare(
        "insert into recipes (title, source_url, saved_at, created_at, updated_at) values (?, ?, ?, ?, ?)",
      )
      .run(title, sourceUrl, savedAt, `opprettet ${title}`, `opprettet ${title}`);
  }

  function savedAts(db: ReturnType<typeof openDatabase>): unknown[] {
    return (
      db.$client.prepare("select saved_at from recipes order by id").all() as {
        saved_at: string | null;
      }[]
    ).map((row) => row.saved_at);
  }

  it("flytter manuelle oppskrifter inn i samlingen og rører ikke importerte", () => {
    const db = openDatabase(MEMORY_DATABASE, folderWithOnlyInit());
    insert(db, "Manuell 1", null, null);
    insert(db, "Manuell 2", null, null);
    insert(db, "Importert", "https://www.matprat.no/x", null);

    runMigrations(db);

    expect(savedAts(db)).toEqual(["opprettet Manuell 1", "opprettet Manuell 2", null]);
  });

  it("endrer ikke en manuell oppskrift som allerede har savedAt, og kan kjøres på nytt", () => {
    const db = openDatabase(MEMORY_DATABASE, folderWithOnlyInit());
    insert(db, "Manuell", null, "allerede lagret");
    runMigrations(db);
    runMigrations(db);
    expect(savedAts(db)).toEqual(["allerede lagret"]);
  });

  it("gir ingen feil på en tom database", () => {
    const db = openDatabase(MEMORY_DATABASE, folderWithOnlyInit());
    expect(() => runMigrations(db)).not.toThrow();
    expect(savedAts(db)).toEqual([]);
  });

  it("er med i journalen og har et tilhørende snapshot", () => {
    const journal = JSON.parse(
      readFileSync(join(migrationsFolder(), "meta", "_journal.json"), "utf8"),
    ) as { entries: { idx: number; tag: string }[] };
    expect(journal.entries.map((e) => e.tag)).toEqual([
      "0000_init",
      "0001_move_manual_recipes_to_collection",
    ]);
    expect(existsSync(join(migrationsFolder(), "meta", "0001_snapshot.json"))).toBe(true);
  });
});
