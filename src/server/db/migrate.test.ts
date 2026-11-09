import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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
      "0002_folders",
      "0003_favorites",
    ]);
    expect(existsSync(join(migrationsFolder(), "meta", "0001_snapshot.json"))).toBe(true);
  });
});

describe("migrasjon 0002 (Story 3.3: mapper)", () => {
  /** En migrasjonsmappe med bare `0000` og `0001`, slik databasen så ut før mapper. */
  function folderBefore0002(): string {
    const dir = mkdtempSync(join(tmpdir(), "recipemate-"));
    dirs.push(dir);
    mkdirSync(join(dir, "meta"));
    for (const file of ["0000_init.sql", "0001_move_manual_recipes_to_collection.sql"]) {
      cpSync(join(migrationsFolder(), file), join(dir, file));
    }
    for (const file of ["0000_snapshot.json", "0001_snapshot.json"]) {
      cpSync(join(migrationsFolder(), "meta", file), join(dir, "meta", file));
    }
    const journal = JSON.parse(
      readFileSync(join(migrationsFolder(), "meta", "_journal.json"), "utf8"),
    ) as { entries: unknown[] };
    journal.entries = journal.entries.slice(0, 2);
    writeFileSync(join(dir, "meta", "_journal.json"), JSON.stringify(journal));
    return dir;
  }

  type Db = ReturnType<typeof openDatabase>;

  function rows(db: Db, sql: string): unknown[] {
    return db.$client.prepare(sql).all();
  }

  /** Database slik den var etter 0001, med to oppskrifter med linjer og steg. */
  function seededBefore0002(): Db {
    const db = openDatabase(MEMORY_DATABASE, folderBefore0002());
    expect(tables(db)).not.toContain("folders");
    const insertRecipe = db.$client.prepare(
      "insert into recipes (title, source_url, saved_at, selected_servings, created_at, updated_at) values (?, ?, ?, ?, 'c', 'u')",
    );
    insertRecipe.run("Pannekaker", null, "lagret", 6);
    insertRecipe.run("Importert", "https://www.matprat.no/x", null, null);
    const line = db.$client.prepare(
      "insert into ingredient_lines (recipe_id, position, original_text, name, parseable) values (?, ?, ?, ?, 1)",
    );
    line.run(1, 0, "3 egg", "egg");
    line.run(1, 1, "6 dl melk", "melk");
    line.run(2, 0, "1 ss salt", "salt");
    const step = db.$client.prepare(
      "insert into steps (recipe_id, position, text) values (?, ?, ?)",
    );
    step.run(1, 0, "Visp.");
    step.run(1, 1, "Stek.");
    return db;
  }

  it("bevarer oppskrifter, linjer og steg og gir folder_id = NULL", () => {
    const db = seededBefore0002();
    const before = {
      recipes: rows(db, "select * from recipes order by id"),
      lines: rows(db, "select * from ingredient_lines order by id"),
      steps: rows(db, "select * from steps order by id"),
    };

    runMigrations(db);

    expect(tables(db)).toContain("folders");
    expect(rows(db, "select * from recipes order by id")).toEqual(
      (before.recipes as Record<string, unknown>[]).map((row) => ({
        ...row,
        folder_id: null,
        is_favorite: 0,
      })),
    );
    expect(rows(db, "select * from ingredient_lines order by id")).toEqual(before.lines);
    expect(rows(db, "select * from steps order by id")).toEqual(before.steps);
    expect(rows(db, "select count(*) as n from recipes")).toEqual([{ n: 2 }]);
  });

  it("kan kjøres på nytt uten feil og uten å endre data", () => {
    const db = seededBefore0002();
    runMigrations(db);
    const once = rows(db, "select * from recipes order by id");
    expect(() => runMigrations(db)).not.toThrow();
    expect(() => runMigrations(db)).not.toThrow();
    expect(rows(db, "select * from recipes order by id")).toEqual(once);
    expect(rows(db, "select count(*) as n from steps")).toEqual([{ n: 2 }]);
  });

  it("gir en ny, tom database alle tabeller", () => {
    const db = openDatabase(MEMORY_DATABASE);
    expect(tables(db)).toEqual(expect.arrayContaining(["folders", "recipes"]));
    expect(rows(db, "select count(*) as n from folders")).toEqual([{ n: 0 }]);
  });

  it("har unik indeks på folders.name_key", () => {
    const db = openDatabase(MEMORY_DATABASE);
    const indexes = db.$client.pragma("index_list(folders)") as { name: string; unique: number }[];
    const unique = indexes.filter((index) => index.unique === 1);
    expect(unique).toHaveLength(1);
    const columns = db.$client.pragma(`index_info(${unique[0].name})`) as { name: string }[];
    expect(columns.map((column) => column.name)).toEqual(["name_key"]);

    const insert = db.$client.prepare(
      "insert into folders (name, name_key, created_at) values (?, ?, 'x')",
    );
    insert.run("Hverdag", "hverdag");
    expect(() => insert.run("HVERDAG", "hverdag")).toThrow(/UNIQUE/);
  });

  it("har fremmednøkkelen recipes.folder_id med ON DELETE SET NULL", () => {
    const db = openDatabase(MEMORY_DATABASE);
    const keys = db.$client.pragma("foreign_key_list(recipes)") as {
      from: string;
      table: string;
      on_delete: string;
    }[];
    expect(keys).toEqual([
      expect.objectContaining({ from: "folder_id", table: "folders", on_delete: "SET NULL" }),
    ]);
  });

  it("setter folder_id til NULL når mappen slettes, uten å slette oppskriften", () => {
    const db = seededBefore0002();
    runMigrations(db);
    db.$client
      .prepare(
        "insert into folders (name, name_key, created_at) values ('Hverdag', 'hverdag', 'x')",
      )
      .run();
    db.$client.prepare("update recipes set folder_id = 1 where id in (1, 2)").run();

    db.$client.prepare("delete from folders where id = 1").run();

    expect(rows(db, "select id, folder_id, updated_at from recipes order by id")).toEqual([
      { id: 1, folder_id: null, updated_at: "u" },
      { id: 2, folder_id: null, updated_at: "u" },
    ]);
    expect(rows(db, "select count(*) as n from ingredient_lines")).toEqual([{ n: 3 }]);
  });

  it("avviser en folder_id som ikke finnes (fremmednøkler er på)", () => {
    const db = openDatabase(MEMORY_DATABASE);
    db.$client
      .prepare("insert into recipes (title, created_at, updated_at) values ('A', 'x', 'x')")
      .run();
    expect(() => db.$client.prepare("update recipes set folder_id = 99").run()).toThrow(
      /FOREIGN KEY/,
    );
  });
});

describe("migrasjon 0003 (Story 3.4: favoritter)", () => {
  type Db = ReturnType<typeof openDatabase>;

  /** En migrasjonsmappe med bare 0000–0002, slik databasen så ut før favoritter. */
  function folderBefore0003(): string {
    const dir = mkdtempSync(join(tmpdir(), "recipemate-"));
    dirs.push(dir);
    mkdirSync(join(dir, "meta"));
    const journal = JSON.parse(
      readFileSync(join(migrationsFolder(), "meta", "_journal.json"), "utf8"),
    ) as { entries: { tag: string }[] };
    journal.entries = journal.entries.slice(0, 3);
    for (const { tag } of journal.entries) {
      cpSync(join(migrationsFolder(), `${tag}.sql`), join(dir, `${tag}.sql`));
      cpSync(
        join(migrationsFolder(), "meta", `${tag.slice(0, 4)}_snapshot.json`),
        join(dir, "meta", `${tag.slice(0, 4)}_snapshot.json`),
      );
    }
    writeFileSync(join(dir, "meta", "_journal.json"), JSON.stringify(journal));
    return dir;
  }

  const rows = (db: Db, sql: string): unknown[] => db.$client.prepare(sql).all();

  /** Database slik den var etter 0002: mappe, oppskrifter i og utenfor den, linjer og steg. */
  function seededBefore0003(): Db {
    const db = openDatabase(MEMORY_DATABASE, folderBefore0003());
    expect(
      rows(db, "pragma table_info(recipes)").map((c) => (c as { name: string }).name),
    ).not.toContain("is_favorite");
    db.$client
      .prepare(
        "insert into folders (name, name_key, created_at) values ('Hverdag', 'hverdag', 'f')",
      )
      .run();
    const insertRecipe = db.$client.prepare(
      "insert into recipes (title, source_url, saved_at, selected_servings, folder_id, created_at, updated_at) values (?, ?, ?, ?, ?, 'c', 'u')",
    );
    insertRecipe.run("Pannekaker", null, "lagret", 6, 1);
    insertRecipe.run("Vafler", null, "lagret", null, null);
    insertRecipe.run("Importert", "https://www.matprat.no/x", null, null, null);
    db.$client
      .prepare(
        "insert into ingredient_lines (recipe_id, position, original_text, name, parseable) values (1, 0, '3 egg', 'egg', 1)",
      )
      .run();
    db.$client
      .prepare("insert into steps (recipe_id, position, text) values (1, 0, 'Visp.')")
      .run();
    return db;
  }

  it("bevarer alle data og gir is_favorite = 0 på eksisterende rader", () => {
    const db = seededBefore0003();
    const before = {
      recipes: rows(db, "select * from recipes order by id") as Record<string, unknown>[],
      folders: rows(db, "select * from folders"),
      lines: rows(db, "select * from ingredient_lines"),
      steps: rows(db, "select * from steps"),
    };

    runMigrations(db);

    expect(rows(db, "select * from recipes order by id")).toEqual(
      before.recipes.map((row) => ({ ...row, is_favorite: 0 })),
    );
    expect(rows(db, "select * from folders")).toEqual(before.folders);
    expect(rows(db, "select * from ingredient_lines")).toEqual(before.lines);
    expect(rows(db, "select * from steps")).toEqual(before.steps);
    expect(rows(db, "select count(*) as n from recipes where is_favorite = 0")).toEqual([{ n: 3 }]);
  });

  it("kan kjøres på nytt uten feil og uten å endre data", () => {
    const db = seededBefore0003();
    runMigrations(db);
    db.$client.prepare("update recipes set is_favorite = 1 where id = 2").run();
    const once = rows(db, "select * from recipes order by id");
    expect(() => runMigrations(db)).not.toThrow();
    expect(() => runMigrations(db)).not.toThrow();
    expect(rows(db, "select * from recipes order by id")).toEqual(once);
  });

  it("kolonnen er heltall, NOT NULL med standardverdi 0, og avviser NULL", () => {
    const db = openDatabase(MEMORY_DATABASE);
    const column = (
      rows(db, "pragma table_info(recipes)") as {
        name: string;
        type: string;
        notnull: number;
        dflt_value: string | null;
      }[]
    ).find((c) => c.name === "is_favorite");
    expect(column).toMatchObject({ type: "INTEGER", notnull: 1, dflt_value: "0" });
    db.$client
      .prepare("insert into recipes (title, created_at, updated_at) values ('A', 'x', 'x')")
      .run();
    expect(rows(db, "select is_favorite from recipes")).toEqual([{ is_favorite: 0 }]);
    expect(() => db.$client.prepare("update recipes set is_favorite = NULL").run()).toThrow(
      /NOT NULL/,
    );
  });

  it("er en ren ALTER TABLE ADD COLUMN, i journalen med snapshot", () => {
    const sql = readFileSync(join(migrationsFolder(), "0003_favorites.sql"), "utf8");
    const statements = sql
      .split("\n")
      .filter((line) => !line.startsWith("--"))
      .join("\n");
    expect(statements.trim()).toMatch(
      /^ALTER TABLE `recipes` ADD `is_favorite` integer DEFAULT 0 NOT NULL;$/,
    );
    expect(existsSync(join(migrationsFolder(), "meta", "0003_snapshot.json"))).toBe(true);
  });

  it("favoritt og mappe er uavhengige: mappen kan slettes uten å miste favoritten", () => {
    const db = seededBefore0003();
    runMigrations(db);
    db.$client.prepare("update recipes set is_favorite = 1 where id = 1").run();
    db.$client.prepare("delete from folders where id = 1").run();
    expect(rows(db, "select id, folder_id, is_favorite from recipes where id = 1")).toEqual([
      { id: 1, folder_id: null, is_favorite: 1 },
    ]);
  });

  it("sletting av oppskriften fjerner favoritten med den", () => {
    const db = seededBefore0003();
    runMigrations(db);
    db.$client.prepare("update recipes set is_favorite = 1 where id = 1").run();
    db.$client.prepare("delete from recipes where id = 1").run();
    expect(rows(db, "select count(*) as n from recipes where is_favorite = 1")).toEqual([{ n: 0 }]);
  });
});
