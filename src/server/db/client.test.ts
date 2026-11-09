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
  return { config: { databasePath: paths.file, llmApiKey: undefined, llmModel: undefined } };
});

const { getDb } = await import("./client");

type GlobalWithDb = typeof globalThis & { __recipemateDb?: ReturnType<typeof getDb> };

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
});
