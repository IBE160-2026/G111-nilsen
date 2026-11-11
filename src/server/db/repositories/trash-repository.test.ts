import { describe, expect, it } from "vitest";
import { createTestDb, TEST_USER_ID, type Db } from "../client";
import { assignRecipeToFolder, insertFolder } from "./folder-repository";
import {
  findRecipeById,
  insertRecipe,
  insertRecipeLabel,
  type NewRecipe,
  updateFitsFor,
  updateNotes,
  updateRating,
} from "./recipe-repository";
import {
  deleteTrashed,
  findDeletedRecipe,
  listDeletedRecipes,
  purgeTrash,
  restoreRecipe,
  trashRecipe,
} from "./trash-repository";

const T0 = "2026-11-09T10:00:00.000Z";
const NOW = "2026-11-11T12:00:00.000Z";
const LONG_AGO = "2026-01-01T00:00:00.000Z";

const base: NewRecipe = {
  title: "Pannekaker",
  sourceUrl: "https://eksempel.no/pannekaker",
  sourceName: "Eksempel",
  originalServings: 4,
  selectedServings: 6,
  savedAt: T0,
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-02T10:00:00.000Z",
  userId: TEST_USER_ID,
  totalMinutes: 30,
  ingredients: [
    {
      position: 1,
      section: "Lefsa",
      original: "salt",
      quantity: null,
      unit: null,
      name: "salt",
      parseable: false,
    },
    {
      position: 0,
      section: null,
      original: "2–3 ss sukker",
      quantity: { min: 2, max: 3 },
      unit: "ss",
      name: "sukker",
      parseable: true,
    },
  ],
  steps: [
    { position: 1, section: null, text: "Stek." },
    { position: 0, section: "Deig", text: "Rør." },
  ],
};

const count = (db: Db, table: string) =>
  (db.$client.prepare(`select count(*) as n from ${table}`).get() as { n: number }).n;

/** En oppskrift med alt som skal følge med: mappe, merkelapper, notater, forslag, ukemeny og handleliste. */
function fullRecipe(db: Db) {
  const folderId = insertFolder(db, {
    name: "Hverdag",
    nameKey: "hverdag",
    createdAt: T0,
    userId: TEST_USER_ID,
  });
  const id = insertRecipe(db, base);
  assignRecipeToFolder(db, TEST_USER_ID, id, folderId);
  updateNotes(db, id, "Mer salt");
  updateFitsFor(db, id, "Barn");
  updateRating(db, id, 4);
  insertRecipeLabel(db, id, "Hverdag", "hverdag", 10);
  insertRecipeLabel(db, id, "Vegetar", "vegetar", 10);
  db.$client.exec(
    "update recipes set is_favorite = 1, cooked_count = 3, last_cooked_at = '2026-11-08T18:00:00.000Z'",
  );
  db.$client
    .prepare(
      "insert into suggestions (recipe_id, text, reason, applies_to, created_at) values (?, 'Mer smør', 'smak', 'ingredients', ?)",
    )
    .run(id, T0);
  db.$client
    .prepare(
      "insert into meal_plan_entries (user_id, recipe_id, day, servings, created_at) values (?, ?, '2026-11-12', 2.5, ?)",
    )
    .run(TEST_USER_ID, id, T0);
  const listId = db.$client
    .prepare(
      "insert into shopping_lists (user_id, name, name_key, created_at, updated_at) values (?, 'Helg', 'helg', ?, ?)",
    )
    .run(TEST_USER_ID, T0, T0).lastInsertRowid;
  db.$client
    .prepare("insert into shopping_list_items (list_id, recipe_id, servings) values (?, ?, 3)")
    .run(listId, id);
  return { id, folderId, listId: Number(listId) };
}

describe("trashRecipe og restoreRecipe (Story 6.11)", () => {
  it("sletter oppskriften og tar vare på tittel og tidspunkt", () => {
    const db = createTestDb();
    const { id } = fullRecipe(db);
    const trashId = trashRecipe(db, id, NOW);
    expect(trashId).not.toBeNull();
    expect(findRecipeById(db, id)).toBeNull();
    expect(count(db, "recipes")).toBe(0);
    expect(count(db, "meal_plan_entries")).toBe(0);
    expect(count(db, "shopping_list_items")).toBe(0);
    expect(listDeletedRecipes(db, TEST_USER_ID, LONG_AGO)).toEqual([
      { id: trashId, title: "Pannekaker", deletedAt: NOW },
    ]);
  });

  it("gjenoppretter alt: innhold, mappe, merkelapper, notater, vurdering, forslag, ukemeny og handleliste", () => {
    const db = createTestDb();
    const { id, folderId, listId } = fullRecipe(db);
    const trashId = trashRecipe(db, id, NOW)!;

    const newId = restoreRecipe(db, TEST_USER_ID, trashId, LONG_AGO);
    expect(newId).not.toBeNull();
    const back = findRecipeById(db, newId!);
    expect(back).toMatchObject({
      title: "Pannekaker",
      sourceUrl: "https://eksempel.no/pannekaker",
      sourceName: "Eksempel",
      originalServings: 4,
      selectedServings: 6,
      totalMinutes: 30,
      savedAt: T0,
      createdAt: "2026-11-01T10:00:00.000Z",
      updatedAt: "2026-11-02T10:00:00.000Z",
      isFavorite: true,
      folderId,
      notes: "Mer salt",
      fitsFor: "Barn",
      rating: 4,
      cookedCount: 3,
      lastCookedAt: "2026-11-08T18:00:00.000Z",
      labels: ["Hverdag", "Vegetar"],
    });
    expect(
      back?.ingredients.map((l) => [
        l.position,
        l.section,
        l.original,
        l.quantity,
        l.unit,
        l.name,
        l.parseable,
      ]),
    ).toEqual([
      [0, null, "2–3 ss sukker", { min: 2, max: 3 }, "ss", "sukker", true],
      [1, "Lefsa", "salt", null, null, "salt", false],
    ]);
    expect(back?.steps.map((s) => [s.position, s.section, s.text])).toEqual([
      [0, "Deig", "Rør."],
      [1, null, "Stek."],
    ]);
    expect(back?.suggestions.map((s) => s.text)).toEqual(["Mer smør"]);
    expect(
      db.$client.prepare("select recipe_id, day, servings from meal_plan_entries").all(),
    ).toEqual([{ recipe_id: newId, day: "2026-11-12", servings: 2.5 }]);
    expect(
      db.$client.prepare("select list_id, recipe_id, servings from shopping_list_items").all(),
    ).toEqual([{ list_id: listId, recipe_id: newId, servings: 3 }]);
    // Søppelen er tom etterpå, og en ny gjenoppretting gir ingenting.
    expect(count(db, "deleted_recipes")).toBe(0);
    expect(restoreRecipe(db, TEST_USER_ID, trashId, LONG_AGO)).toBeNull();
  });

  it("hopper over mappe og handleliste som er slettet i mellomtiden", () => {
    const db = createTestDb();
    const { id, folderId, listId } = fullRecipe(db);
    const trashId = trashRecipe(db, id, NOW)!;
    db.$client.prepare("delete from folders where id = ?").run(folderId);
    db.$client.prepare("delete from shopping_lists where id = ?").run(listId);
    const newId = restoreRecipe(db, TEST_USER_ID, trashId, LONG_AGO)!;
    expect(findRecipeById(db, newId)).toMatchObject({ folderId: null, title: "Pannekaker" });
    expect(count(db, "shopping_list_items")).toBe(0);
    expect(count(db, "meal_plan_entries")).toBe(1);
  });

  it("sletter bare lagrede oppskrifter med eier, og ellers ingenting", () => {
    const db = createTestDb();
    const unsaved = insertRecipe(db, { ...base, savedAt: null });
    const ownerless = insertRecipe(db, { ...base, userId: null });
    expect(trashRecipe(db, 999, NOW)).toBeNull();
    expect(trashRecipe(db, unsaved, NOW)).toBeNull();
    expect(trashRecipe(db, ownerless, NOW)).toBeNull();
    expect(count(db, "recipes")).toBe(2);
    expect(count(db, "deleted_recipes")).toBe(0);
  });

  it("gjenoppretting gir null for en annen bruker, for gammel og ødelagt bilde, uten å endre noe", () => {
    const db = createTestDb();
    db.$client.exec(
      "insert into users (id, email, password_hash, created_at) values (2, 'b@example.com', 'x', '2026-01-01T00:00:00.000Z')",
    );
    const { id } = fullRecipe(db);
    const trashId = trashRecipe(db, id, NOW)!;
    expect(restoreRecipe(db, 2, trashId, LONG_AGO)).toBeNull();
    expect(restoreRecipe(db, TEST_USER_ID, trashId, "2026-12-01T00:00:00.000Z")).toBeNull();
    expect(restoreRecipe(db, TEST_USER_ID, 999, LONG_AGO)).toBeNull();
    db.$client.prepare("update deleted_recipes set snapshot = '{ikke json'").run();
    expect(restoreRecipe(db, TEST_USER_ID, trashId, LONG_AGO)).toBeNull();
    db.$client.prepare("update deleted_recipes set snapshot = '{\"title\":1}'").run();
    expect(restoreRecipe(db, TEST_USER_ID, trashId, LONG_AGO)).toBeNull();
    expect(count(db, "recipes")).toBe(0);
    expect(count(db, "deleted_recipes")).toBe(1);
  });
});

describe("liste, oppslag, sletting for godt og rydding (Story 6.11)", () => {
  function trashTwo(db: Db) {
    const a = trashRecipe(
      db,
      insertRecipe(db, { ...base, title: "A" }),
      "2026-11-05T10:00:00.000Z",
    )!;
    const b = trashRecipe(
      db,
      insertRecipe(db, { ...base, title: "B" }),
      "2026-11-10T10:00:00.000Z",
    )!;
    return { a, b };
  }

  it("lister nyeste først og bare de som er slettet fra og med grensen", () => {
    const db = createTestDb();
    const { a, b } = trashTwo(db);
    expect(listDeletedRecipes(db, TEST_USER_ID, LONG_AGO).map((r) => r.id)).toEqual([b, a]);
    expect(
      listDeletedRecipes(db, TEST_USER_ID, "2026-11-06T00:00:00.000Z").map((r) => r.id),
    ).toEqual([b]);
    expect(listDeletedRecipes(db, 2, LONG_AGO)).toEqual([]);
  });

  it("finner én for eieren, men ikke for en annen eller for gammel", () => {
    const db = createTestDb();
    const { a } = trashTwo(db);
    expect(findDeletedRecipe(db, TEST_USER_ID, a, LONG_AGO)?.title).toBe("A");
    expect(findDeletedRecipe(db, 2, a, LONG_AGO)).toBeNull();
    expect(findDeletedRecipe(db, TEST_USER_ID, a, "2026-11-06T00:00:00.000Z")).toBeNull();
    expect(findDeletedRecipe(db, TEST_USER_ID, 999, LONG_AGO)).toBeNull();
  });

  it("sletter for godt bare for eieren", () => {
    const db = createTestDb();
    const { a } = trashTwo(db);
    expect(deleteTrashed(db, 2, a)).toBe(false);
    expect(deleteTrashed(db, TEST_USER_ID, a)).toBe(true);
    expect(deleteTrashed(db, TEST_USER_ID, a)).toBe(false);
    expect(count(db, "deleted_recipes")).toBe(1);
  });

  it("rydder bort de som er eldre enn grensen", () => {
    const db = createTestDb();
    const { b } = trashTwo(db);
    expect(purgeTrash(db, "2026-11-06T00:00:00.000Z")).toBe(1);
    expect(listDeletedRecipes(db, TEST_USER_ID, LONG_AGO).map((r) => r.id)).toEqual([b]);
  });

  it("følger brukeren når brukeren slettes", () => {
    const db = createTestDb();
    trashTwo(db);
    db.$client.exec("delete from users");
    expect(count(db, "deleted_recipes")).toBe(0);
  });
});
