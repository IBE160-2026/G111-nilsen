import { describe, expect, it } from "vitest";
import { createTestDb, TEST_USER_ID, type Db } from "../db/client";
import {
  BACKUP_FORMAT,
  BACKUP_MAX_RECIPES,
  BACKUP_VERSION,
  exportBackup,
  importBackup,
} from "./backup-service";
import {
  addRecipeLabel,
  createManualRecipe,
  getRecipe,
  listCollection,
  setFavorite,
  setRecipeFitsFor,
  setRecipeNotes,
  setRecipeRating,
} from "./recipe-service";
import { moveRecipeToNewFolder as assignToNewFolder } from "./folder-service";

const OTHER = 2;

function withOtherUser(db: Db) {
  db.$client
    .prepare(
      "insert into users (id, email, password_hash, created_at) values (?, 'annen@example.com', 'x', '2026-01-01T00:00:00.000Z')",
    )
    .run(OTHER);
}

function seed(db: Db) {
  const created = createManualRecipe(
    TEST_USER_ID,
    {
      title: "Pannekaker",
      servings: 4,
      minutes: 30,
      ingredients: ["3 dl hvetemel", "6 dl melk", "3 egg"],
      steps: ["Visp sammen.", "Stek."],
    },
    db,
  );
  if (!created.ok) throw new Error("kunne ikke lagre");
  const id = created.value.id;
  setFavorite(id, true, db);
  setRecipeRating(id, 4, db);
  setRecipeNotes(id, "Bruk litt mer melk", db);
  setRecipeFitsFor(id, "Barn", db);
  addRecipeLabel(id, "Rask", db);
  assignToNewFolder(TEST_USER_ID, id, "Hverdag", db);
  return id;
}

describe("exportBackup", () => {
  it("gir formatet, versjonen og bare brukerens egne lagrede oppskrifter", () => {
    const db = createTestDb();
    withOtherUser(db);
    seed(db);
    createManualRecipe(
      OTHER,
      { title: "Annens", servings: 2, ingredients: ["1 egg"], steps: [] },
      db,
    );
    const result = exportBackup(TEST_USER_ID, db, new Date("2026-11-12T10:00:00.000Z"));
    if (!result.ok) throw new Error("feilet");
    expect(result.value).toMatchObject({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: "2026-11-12T10:00:00.000Z",
    });
    expect(result.value.recipes).toHaveLength(1);
    expect(result.value.recipes[0]).toMatchObject({
      title: "Pannekaker",
      originalServings: 4,
      totalMinutes: 30,
      isFavorite: true,
      rating: 4,
      notes: "Bruk litt mer melk",
      fitsFor: "Barn",
      folder: "Hverdag",
      labels: ["Rask"],
      ingredients: [
        { section: null, text: "3 dl hvetemel" },
        { section: null, text: "6 dl melk" },
        { section: null, text: "3 egg" },
      ],
      steps: [
        { section: null, text: "Visp sammen." },
        { section: null, text: "Stek." },
      ],
    });
  });

  it("gir en tom liste uten oppskrifter", () => {
    const result = exportBackup(TEST_USER_ID, createTestDb());
    expect(result.ok && result.value.recipes).toEqual([]);
  });
});

describe("importBackup", () => {
  it("flytter oppskriftene med alt innhold til en annen konto", () => {
    const db = createTestDb();
    withOtherUser(db);
    seed(db);
    const exported = exportBackup(TEST_USER_ID, db);
    if (!exported.ok) throw new Error("feilet");
    const json = JSON.parse(JSON.stringify(exported.value));

    const result = importBackup(OTHER, json, db, new Date("2026-11-12T11:00:00.000Z"));
    expect(result).toEqual({ ok: true, value: { imported: 1, skipped: 0 } });

    const mine = listCollection(OTHER, db);
    if (!mine.ok) throw new Error("feilet");
    expect(mine.value).toHaveLength(1);
    expect(mine.value[0]).toMatchObject({
      title: "Pannekaker",
      isFavorite: true,
      rating: 4,
      folderName: "Hverdag",
      labels: ["Rask"],
    });
    const recipe = getRecipe(mine.value[0]!.id, db);
    if (!recipe.ok) throw new Error("feilet");
    expect(recipe.value.ingredients.map((line) => line.name)).toEqual(["hvetemel", "melk", "egg"]);
    expect(recipe.value.ingredients[0]).toMatchObject({ unit: "dl", parseable: true });
    expect(recipe.value.steps.map((step) => step.text)).toEqual(["Visp sammen.", "Stek."]);
    expect(recipe.value.notes).toBe("Bruk litt mer melk");
    expect(recipe.value.totalMinutes).toBe(30);
    // Originalen er urørt.
    const original = listCollection(TEST_USER_ID, db);
    expect(original.ok && original.value).toHaveLength(1);
  });

  it("hopper over det brukeren allerede har, så samme fil kan importeres to ganger", () => {
    const db = createTestDb();
    seed(db);
    const exported = exportBackup(TEST_USER_ID, db);
    if (!exported.ok) throw new Error("feilet");
    const json = JSON.parse(JSON.stringify(exported.value));
    expect(importBackup(TEST_USER_ID, json, db)).toEqual({
      ok: true,
      value: { imported: 0, skipped: 1 },
    });
    const all = listCollection(TEST_USER_ID, db);
    expect(all.ok && all.value).toHaveLength(1);
  });

  it("bruker en mappe som finnes fra før i stedet for å lage en ny", () => {
    const db = createTestDb();
    withOtherUser(db);
    seed(db);
    const first = createManualRecipe(
      OTHER,
      { title: "X", servings: 1, ingredients: ["1 egg"], steps: [] },
      db,
    );
    if (!first.ok) throw new Error("feilet");
    assignToNewFolder(OTHER, first.value.id, "hverdag", db);
    const exported = exportBackup(TEST_USER_ID, db);
    if (!exported.ok) throw new Error("feilet");
    importBackup(OTHER, JSON.parse(JSON.stringify(exported.value)), db);
    const n = (
      db.$client.prepare("select count(*) as n from folders where user_id = ?").get(OTHER) as {
        n: number;
      }
    ).n;
    expect(n).toBe(1);
  });

  it("avviser ugyldig innhold og lagrer ingenting", () => {
    const db = createTestDb();
    const base = { format: BACKUP_FORMAT, version: BACKUP_VERSION, recipes: [] };
    const good = {
      title: "A",
      sourceUrl: null,
      sourceName: null,
      originalServings: null,
      totalMinutes: null,
      isFavorite: false,
      notes: null,
      fitsFor: null,
      rating: null,
      cookedCount: 0,
      lastCookedAt: null,
      folder: null,
      labels: [],
      ingredients: [{ section: null, text: "1 egg" }],
      steps: [],
    };
    const bad = [
      null,
      "tekst",
      {},
      { ...base, format: "annet" },
      { ...base, version: 2 },
      { ...base, recipes: [{ ...good, title: "" }] },
      { ...base, recipes: [{ ...good, rating: 9 }] },
      { ...base, recipes: [{ ...good, ingredients: [] }] },
      { ...base, recipes: [{ ...good, labels: Array(11).fill("x") }] },
      { ...base, recipes: [good, { ...good, originalServings: 0 }] },
      { ...base, recipes: [{ ...good, folder: "x".repeat(41) }] },
      { ...base, recipes: Array(BACKUP_MAX_RECIPES + 1).fill(good) },
    ];
    for (const input of bad) {
      expect(importBackup(TEST_USER_ID, input, db)).toEqual({
        ok: false,
        error: { kind: "validation", detail: "backup_invalid" },
      });
    }
    const all = listCollection(TEST_USER_ID, db);
    expect(all.ok && all.value).toHaveLength(0);
    expect(importBackup(TEST_USER_ID, { ...base, recipes: [good] }, db)).toEqual({
      ok: true,
      value: { imported: 1, skipped: 0 },
    });
  });
});
