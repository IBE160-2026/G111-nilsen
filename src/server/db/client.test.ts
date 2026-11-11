import { existsSync, rmSync } from "node:fs";
import { afterAll, describe, expect, it, vi } from "vitest";

// Mock-fabrikken kjører før importene i fila, så den henter node-modulene selv.
const paths = vi.hoisted(() => ({ dir: "", file: "" }));

vi.mock("../config", async () => {
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  paths.dir = mkdtempSync(join(tmpdir(), "recipemate-client-"));
  paths.file = join(paths.dir, "data", "recipemate.db");
  return {
    config: {
      databasePath: paths.file,
      llmApiKey: undefined,
      llmModel: undefined,
      isProduction: false,
    },
  };
});

const { getDb } = await import("./client");

type GlobalWithDb = typeof globalThis & {
  __recipemateDb?: ReturnType<typeof getDb>;
  __recipemateDbMigrations?: number;
};

afterAll(() => {
  const global = globalThis as GlobalWithDb;
  global.__recipemateDb?.$client.close();
  delete global.__recipemateDb;
  rmSync(paths.dir, { recursive: true, force: true });
});

describe("getDb", () => {
  it("åpner ikke databasen ved import", () => {
    expect(existsSync(paths.file)).toBe(false);
    expect((globalThis as GlobalWithDb).__recipemateDb).toBeUndefined();
  });

  it("åpner databasefila fra config.databasePath med tabellene, og gjenbruker tilkoblingen", () => {
    const db = getDb();
    expect(existsSync(paths.file)).toBe(true);
    expect(db.$client.name).toBe(paths.file);
    const tables = db.$client
      .prepare("select name from sqlite_master where type = 'table' and name = 'recipes'")
      .all();
    expect(tables).toEqual([{ name: "recipes" }]);
    expect(getDb()).toBe(db);
  });

  it("kjører migrasjonene på nytt i utvikling når journalen er endret siden tilkoblingen ble åpnet", () => {
    const global = globalThis as GlobalWithDb;
    const db = getDb();
    const actual = global.__recipemateDbMigrations;
    expect(actual).toBeGreaterThan(0);
    global.__recipemateDbMigrations = 1; // later som tilkoblingen ble åpnet før nyere migrasjoner fantes
    db.$client.exec("drop table pantry_items");
    db.$client.exec("drop table suggestions");
    db.$client.exec("drop table folders");
    db.$client.exec(
      "delete from __drizzle_migrations where created_at > (select min(created_at) from __drizzle_migrations)",
    ); // bare 0000 er igjen
    db.$client.exec("drop table deleted_recipes");
    db.$client.exec("drop table recipe_labels");
    db.$client.exec("drop table shopping_list_items");
    db.$client.exec("drop table shopping_lists");
    db.$client.exec("drop table week_checks");
    db.$client.exec("drop table meal_plan_entries");
    db.$client.exec("drop table sessions");
    db.$client.exec("alter table recipes drop column rating");
    db.$client.exec("alter table recipes drop column fits_for");
    db.$client.exec("alter table recipes drop column cooked_count");
    db.$client.exec("alter table recipes drop column last_cooked_at");
    db.$client.exec("alter table recipes drop column notes");
    db.$client.exec("alter table recipes drop column total_minutes");
    db.$client.exec("alter table recipes drop column user_id");
    db.$client.exec("drop table users");
    db.$client.exec("alter table recipes drop column is_favorite");
    db.$client.exec("alter table recipes drop column folder_id");
    expect(getDb()).toBe(db);
    expect(global.__recipemateDbMigrations).toBe(actual);
    expect(db.$client.prepare("select count(*) as n from folders").get()).toEqual({ n: 0 });
  });
});
