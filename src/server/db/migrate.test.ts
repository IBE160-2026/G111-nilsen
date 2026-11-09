import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openDatabase, runMigrations } from "./migrate";

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
