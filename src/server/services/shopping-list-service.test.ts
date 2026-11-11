import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type Db, TEST_USER_ID } from "../db/client";
import { insertRecipe, type NewRecipe } from "../db/repositories/recipe-repository";
import {
  getSavedList,
  listSavedLists,
  removeSavedList,
  saveSavedList,
  SAVED_LISTS_MAX,
} from "./shopping-list-service";

const T0 = "2026-11-09T10:00:00.000Z";
const OTHER_USER = 2;

const recipe = (title: string, savedAt: string | null = T0, userId = TEST_USER_ID): NewRecipe => ({
  title,
  sourceUrl: null,
  sourceName: null,
  originalServings: 4,
  selectedServings: null,
  savedAt,
  createdAt: T0,
  updatedAt: T0,
  ingredients: [],
  steps: [],
  userId,
});

let db: Db;
let a: number;
let b: number;
beforeEach(() => {
  db = createTestDb();
  db.$client
    .prepare(
      "insert into users (id, email, password_hash, created_at) values (?, 'annen@example.com', 'x', ?)",
    )
    .run(OTHER_USER, T0);
  a = insertRecipe(db, recipe("Pannekaker"));
  b = insertRecipe(db, recipe("Vafler"));
});

const names = (userId = TEST_USER_ID) => {
  const result = listSavedLists(userId, db);
  return result.ok ? result.value.map((list) => `${list.name} ${list.recipes}`) : [];
};

describe("saveSavedList", () => {
  it("lagrer navn, oppskrifter og porsjoner, og gir dem tilbake", () => {
    const saved = saveSavedList(
      TEST_USER_ID,
      "  Uke   46 ",
      [
        { recipeId: a, servings: 4 },
        { recipeId: b, servings: 2.5 },
      ],
      db,
    );
    expect(saved).toMatchObject({ ok: true });
    const id = saved.ok ? saved.value.id : 0;
    expect(names()).toEqual(["Uke 46 2"]);
    expect(getSavedList(TEST_USER_ID, id, db)).toEqual({
      ok: true,
      value: {
        id,
        name: "Uke 46",
        items: [
          { recipeId: a, servings: 4 },
          { recipeId: b, servings: 2.5 },
        ],
      },
    });
  });

  it("samme navn (uavhengig av store og små bokstaver) erstatter listen", () => {
    const first = saveSavedList(TEST_USER_ID, "Uke 46", [{ recipeId: a, servings: 4 }], db);
    const second = saveSavedList(TEST_USER_ID, "uke 46", [{ recipeId: b, servings: 6 }], db);
    expect(first.ok && second.ok && first.value.id === second.value.id).toBe(true);
    expect(names()).toEqual(["uke 46 1"]);
    const id = second.ok ? second.value.id : 0;
    expect(getSavedList(TEST_USER_ID, id, db)).toMatchObject({
      value: { items: [{ recipeId: b, servings: 6 }] },
    });
  });

  it("avviser tomt og for langt navn, ingen eller for mange oppskrifter og ugyldig antall", () => {
    const ok = [{ recipeId: a, servings: 4 }];
    for (const name of ["", "   ", 5, null]) {
      expect(saveSavedList(TEST_USER_ID, name, ok, db)).toMatchObject({
        ok: false,
        error: { kind: "validation", detail: "name_required" },
      });
    }
    expect(saveSavedList(TEST_USER_ID, "x".repeat(61), ok, db)).toMatchObject({
      error: { detail: "name_too_long" },
    });
    for (const items of [
      [],
      "x",
      null,
      [null],
      [
        { recipeId: a, servings: 4 },
        { recipeId: a, servings: 4 },
      ],
    ]) {
      expect(saveSavedList(TEST_USER_ID, "Liste", items, db)).toMatchObject({
        error: { kind: "validation", detail: "items" },
      });
    }
    for (const servings of [0, 51, "4", NaN, 1.3]) {
      expect(saveSavedList(TEST_USER_ID, "Liste", [{ recipeId: a, servings }], db)).toMatchObject({
        error: { kind: "validation", detail: "servings" },
      });
    }
    expect(names()).toEqual([]);
  });

  it("avviser en annens, ulagret eller ukjent oppskrift uten å endre noe", () => {
    const theirs = insertRecipe(db, recipe("Deres", T0, OTHER_USER));
    const unsaved = insertRecipe(db, recipe("Ulagret", null));
    saveSavedList(TEST_USER_ID, "Liste", [{ recipeId: a, servings: 4 }], db);
    for (const recipeId of [theirs, unsaved, 999, 0, 1.5]) {
      expect(saveSavedList(TEST_USER_ID, "Liste", [{ recipeId, servings: 4 }], db)).toMatchObject({
        ok: false,
        error: { kind: "not_found" },
      });
    }
    expect(names()).toEqual(["Liste 1"]);
  });

  it("har en grense for antall lister, men erstatting går alltid an", () => {
    for (let i = 0; i < SAVED_LISTS_MAX; i++)
      expect(saveSavedList(TEST_USER_ID, `Liste ${i}`, [{ recipeId: a, servings: 4 }], db).ok).toBe(
        true,
      );
    expect(saveSavedList(TEST_USER_ID, "En til", [{ recipeId: a, servings: 4 }], db)).toMatchObject(
      {
        error: { kind: "validation", detail: "limit" },
      },
    );
    expect(saveSavedList(TEST_USER_ID, "Liste 3", [{ recipeId: b, servings: 4 }], db).ok).toBe(
      true,
    );
  });

  it("hver bruker har sine egne lister, også med samme navn", () => {
    const theirs = insertRecipe(db, recipe("Deres", T0, OTHER_USER));
    saveSavedList(TEST_USER_ID, "Uke 46", [{ recipeId: a, servings: 4 }], db);
    const other = saveSavedList(OTHER_USER, "Uke 46", [{ recipeId: theirs, servings: 4 }], db);
    expect(other.ok).toBe(true);
    expect(names(OTHER_USER)).toEqual(["Uke 46 1"]);
    expect(getSavedList(TEST_USER_ID, other.ok ? other.value.id : 0, db)).toMatchObject({
      ok: false,
    });
  });
});

describe("removeSavedList og getSavedList", () => {
  it("sletter egen liste, men ikke en annens eller en ukjent", () => {
    const mine = saveSavedList(TEST_USER_ID, "Min", [{ recipeId: a, servings: 4 }], db);
    const id = mine.ok ? mine.value.id : 0;
    expect(removeSavedList(OTHER_USER, id, db)).toMatchObject({ ok: false });
    for (const bad of [999, 0, 1.5, "1", null]) {
      expect(removeSavedList(TEST_USER_ID, bad, db)).toMatchObject({ ok: false });
      expect(getSavedList(TEST_USER_ID, bad, db)).toMatchObject({ ok: false });
    }
    expect(removeSavedList(TEST_USER_ID, id, db)).toEqual({ ok: true, value: { id } });
    expect(names()).toEqual([]);
  });

  it("listen slettes når oppskriften slettes", () => {
    saveSavedList(
      TEST_USER_ID,
      "Min",
      [
        { recipeId: a, servings: 4 },
        { recipeId: b, servings: 4 },
      ],
      db,
    );
    db.$client.prepare("delete from recipes where id = ?").run(a);
    expect(names()).toEqual(["Min 1"]);
  });
});
