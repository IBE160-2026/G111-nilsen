import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createTestDb, TEST_USER_ID, type Db } from "../db/client";
import { insertRecipe, type NewRecipe } from "../db/repositories/recipe-repository";
import { recipes } from "../db/schema";
import {
  addToWeek,
  listPlannable,
  listPlannedWeeks,
  listWeek,
  removeFromWeek,
  todayInOslo,
  weekShoppingSelection,
  weekStart,
} from "./meal-plan-service";

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

function withOtherUser(): Db {
  const db = createTestDb();
  db.$client
    .prepare(
      "insert into users (id, email, password_hash, created_at) values (?, 'annen@example.com', 'x', ?)",
    )
    .run(OTHER_USER, T0);
  return db;
}

const titles = (db: Db, userId: number, monday: string) => {
  const result = listWeek(userId, monday, db);
  return result.ok
    ? result.value.map((entry) => `${entry.day} ${entry.title} ${entry.servings}`)
    : [];
};

describe("weekStart og todayInOslo", () => {
  it("bruker norsk dato, også rett etter midnatt", () => {
    // 23:30 UTC søndag 15. november er 00:30 mandag 16. november i Oslo.
    const late = new Date("2026-11-15T23:30:00.000Z");
    expect(todayInOslo(late)).toBe("2026-11-16");
    expect(weekStart(undefined, late)).toBe("2026-11-16");
  });

  it("går til mandagen for en gyldig dag, og til denne uka for noe ugyldig", () => {
    const now = new Date("2026-11-11T12:00:00.000Z");
    expect(weekStart("2026-11-15", now)).toBe("2026-11-09");
    expect(weekStart("2026-12-02", now)).toBe("2026-11-30");
    for (const raw of ["", "2026-02-30", "neste", ["2026-12-02"], 5])
      expect(weekStart(raw, now)).toBe("2026-11-09");
  });
});

describe("addToWeek og listWeek", () => {
  it("legger lagrede oppskrifter på dager og viser bare den valgte uka, sortert på dag", () => {
    const db = createTestDb();
    const pancakes = insertRecipe(db, recipe("Pannekaker"));
    const taco = insertRecipe(db, recipe("Taco"));
    expect(addToWeek(TEST_USER_ID, taco, "2026-11-13", 4, db).ok).toBe(true);
    expect(addToWeek(TEST_USER_ID, pancakes, "2026-11-09", 2.5, db).ok).toBe(true);
    expect(addToWeek(TEST_USER_ID, pancakes, "2026-11-15", 2, db).ok).toBe(true);
    expect(addToWeek(TEST_USER_ID, pancakes, "2026-11-16", 2, db).ok).toBe(true);
    expect(titles(db, TEST_USER_ID, "2026-11-09")).toEqual([
      "2026-11-09 Pannekaker 2.5",
      "2026-11-13 Taco 4",
      "2026-11-15 Pannekaker 2",
    ]);
    expect(titles(db, TEST_USER_ID, "2026-11-16")).toEqual(["2026-11-16 Pannekaker 2"]);
  });

  it("avviser ugyldig dag og antall uten å lagre", () => {
    const db = createTestDb();
    const id = insertRecipe(db, recipe("Pannekaker"));
    for (const day of ["2026-02-30", "mandag", ""])
      expect(addToWeek(TEST_USER_ID, id, day, 4, db)).toMatchObject({
        ok: false,
        error: { kind: "validation", detail: "day" },
      });
    for (const servings of [0, -1, 0.3, 51, Number.NaN])
      expect(addToWeek(TEST_USER_ID, id, "2026-11-09", servings, db)).toMatchObject({
        ok: false,
        error: { kind: "validation", detail: "servings" },
      });
    expect(titles(db, TEST_USER_ID, "2026-11-09")).toEqual([]);
  });

  it("gir not_found for ukjent, ulagret og en annens oppskrift", () => {
    const db = withOtherUser();
    const unsaved = insertRecipe(db, recipe("Ulagret", null));
    const theirs = insertRecipe(db, recipe("Deres", T0, OTHER_USER));
    for (const recipeId of [999, 0, -1, 1.5, unsaved, theirs])
      expect(addToWeek(TEST_USER_ID, recipeId, "2026-11-09", 4, db)).toMatchObject({
        ok: false,
        error: { kind: "not_found" },
      });
    expect(titles(db, TEST_USER_ID, "2026-11-09")).toEqual([]);
  });

  it("viser bare brukerens egne oppføringer", () => {
    const db = withOtherUser();
    const theirs = insertRecipe(db, recipe("Deres", T0, OTHER_USER));
    addToWeek(OTHER_USER, theirs, "2026-11-09", 4, db);
    expect(titles(db, TEST_USER_ID, "2026-11-09")).toEqual([]);
    expect(titles(db, OTHER_USER, "2026-11-09")).toEqual(["2026-11-09 Deres 4"]);
  });

  it("avviser en ugyldig uke", () => {
    expect(listWeek(TEST_USER_ID, "neste", createTestDb()).ok).toBe(false);
  });

  it("fjerner oppføringene når oppskriften slettes", () => {
    const db = createTestDb();
    const id = insertRecipe(db, recipe("Pannekaker"));
    addToWeek(TEST_USER_ID, id, "2026-11-09", 4, db);
    db.delete(recipes).where(eq(recipes.id, id)).run();
    expect(titles(db, TEST_USER_ID, "2026-11-09")).toEqual([]);
  });
});

describe("removeFromWeek", () => {
  it("fjerner egen oppføring, men ikke en annens eller en ukjent", () => {
    const db = withOtherUser();
    const mine = insertRecipe(db, recipe("Min"));
    const theirs = insertRecipe(db, recipe("Deres", T0, OTHER_USER));
    const own = addToWeek(TEST_USER_ID, mine, "2026-11-09", 4, db);
    const other = addToWeek(OTHER_USER, theirs, "2026-11-09", 4, db);
    if (!own.ok || !other.ok) throw new Error("feil");
    expect(removeFromWeek(TEST_USER_ID, other.value.id, db)).toMatchObject({ ok: false });
    for (const id of [999, 0, 1.5])
      expect(removeFromWeek(TEST_USER_ID, id, db)).toMatchObject({ ok: false });
    expect(removeFromWeek(TEST_USER_ID, own.value.id, db)).toEqual({
      ok: true,
      value: { id: own.value.id },
    });
    expect(titles(db, TEST_USER_ID, "2026-11-09")).toEqual([]);
    expect(titles(db, OTHER_USER, "2026-11-09")).toEqual(["2026-11-09 Deres 4"]);
  });
});

describe("listPlannable", () => {
  it("gir brukerens lagrede oppskrifter sortert på tittel", () => {
    const db = withOtherUser();
    insertRecipe(db, recipe("Vafler"));
    insertRecipe(db, recipe("Ulagret", null));
    insertRecipe(db, recipe("Deres", T0, OTHER_USER));
    insertRecipe(db, recipe("Pannekaker"));
    const result = listPlannable(TEST_USER_ID, db);
    expect(result.ok && result.value.map((r) => r.title)).toEqual(["Pannekaker", "Vafler"]);
  });
});

describe("weekShoppingSelection", () => {
  it("legger sammen antall porsjoner per oppskrift, maks 50", () => {
    const entry = (recipeId: number, servings: number) => ({
      id: 1,
      day: "2026-11-09",
      servings,
      recipeId,
      title: "x",
      originalServings: 4,
    });
    expect(weekShoppingSelection([entry(1, 2), entry(2, 4), entry(1, 3.5)])).toEqual({
      1: 5.5,
      2: 4,
    });
    expect(weekShoppingSelection([entry(1, 30), entry(1, 30)])).toEqual({ 1: 50 });
    expect(weekShoppingSelection([])).toEqual({});
  });
});

describe("listPlannedWeeks", () => {
  it("samler dagene i uker med antall retter, nyeste først, og bare for brukeren selv", () => {
    const db = withOtherUser();
    const id = insertRecipe(db, recipe("Pannekaker"));
    const other = insertRecipe(db, recipe("Taco", T0, OTHER_USER));
    addToWeek(TEST_USER_ID, id, "2026-11-09", 2, db);
    addToWeek(TEST_USER_ID, id, "2026-11-15", 2, db);
    addToWeek(TEST_USER_ID, id, "2026-11-02", 4, db);
    addToWeek(OTHER_USER, other, "2026-12-01", 4, db);
    expect(listPlannedWeeks(TEST_USER_ID, db)).toEqual({
      ok: true,
      value: [
        { monday: "2026-11-09", meals: 2, titles: ["Pannekaker"] },
        { monday: "2026-11-02", meals: 1, titles: ["Pannekaker"] },
      ],
    });
    expect(listPlannedWeeks(3, db)).toEqual({ ok: true, value: [] });
  });

  it("lister titlene i dagsrekkefølge, uten gjentakelser", () => {
    const db = createTestDb();
    const pancakes = insertRecipe(db, recipe("Pannekaker"));
    const taco = insertRecipe(db, recipe("Taco"));
    addToWeek(TEST_USER_ID, taco, "2026-11-13", 4, db);
    addToWeek(TEST_USER_ID, pancakes, "2026-11-10", 2, db);
    addToWeek(TEST_USER_ID, pancakes, "2026-11-15", 2, db);
    const result = listPlannedWeeks(TEST_USER_ID, db);
    expect(result.ok && result.value).toEqual([
      { monday: "2026-11-09", meals: 3, titles: ["Pannekaker", "Taco"] },
    ]);
  });

  it("viser høyst 52 uker", () => {
    const db = createTestDb();
    const id = insertRecipe(db, recipe("Pannekaker"));
    for (let week = 0; week < 60; week++) {
      const monday = new Date(Date.UTC(2025, 0, 6 + week * 7)).toISOString().slice(0, 10);
      addToWeek(TEST_USER_ID, id, monday, 2, db);
    }
    const result = listPlannedWeeks(TEST_USER_ID, db);
    expect(result.ok && result.value).toHaveLength(52);
  });
});
