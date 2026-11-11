import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type Db, TEST_USER_ID } from "../db/client";
import { addPantryItem, clearPantry, listPantry, removePantryItem } from "./pantry-service";

let db: Db;
beforeEach(() => {
  db = createTestDb();
});

const names = () => {
  const result = listPantry(TEST_USER_ID, db);
  if (!result.ok) throw new Error("kunne ikke lese");
  return result.value.map((item) => item.name);
};

describe("pantry-service", () => {
  it("er tom til noe legges til, og lister sortert på navn", () => {
    expect(names()).toEqual([]);
    addPantryItem(TEST_USER_ID, "Salt", db);
    addPantryItem(TEST_USER_ID, "Olivenolje", db);
    expect(names()).toEqual(["Olivenolje", "Salt"]);
  });

  it("rydder navnet: trimmer og samler mellomrom", () => {
    const added = addPantryItem(TEST_USER_ID, "   hvete   mel ", db);
    expect(added).toMatchObject({ ok: true, value: { name: "hvete mel" } });
  });

  it("samme navn to ganger, også med andre store bokstaver, gir den som finnes", () => {
    const first = addPantryItem(TEST_USER_ID, "Salt", db);
    const second = addPantryItem(TEST_USER_ID, "  SALT ", db);
    expect(first.ok && second.ok && first.value.id === second.value.id).toBe(true);
    expect(names()).toEqual(["Salt"]);
  });

  it("avviser tomt og for langt navn uten å lagre", () => {
    expect(addPantryItem(TEST_USER_ID, "   ", db)).toMatchObject({
      ok: false,
      error: { kind: "validation", detail: "name_required" },
    });
    expect(addPantryItem(TEST_USER_ID, "a".repeat(61), db)).toMatchObject({
      ok: false,
      error: { kind: "validation", detail: "name_too_long" },
    });
    expect(addPantryItem(TEST_USER_ID, "a".repeat(60), db).ok).toBe(true);
    expect(names()).toHaveLength(1);
  });

  it("bruker klokken som er gitt til tidspunktet", () => {
    addPantryItem(TEST_USER_ID, "Salt", db, () => new Date("2026-11-10T12:00:00.000Z"));
    expect(db.$client.prepare("select created_at as t from pantry_items").get()).toEqual({
      t: "2026-11-10T12:00:00.000Z",
    });
  });

  it("fjerner en oppføring, og ukjent eller ugyldig id gir not_found", () => {
    const added = addPantryItem(TEST_USER_ID, "Salt", db);
    if (!added.ok) throw new Error("feil");
    expect(removePantryItem(TEST_USER_ID, added.value.id, db)).toEqual({
      ok: true,
      value: { id: added.value.id },
    });
    expect(names()).toEqual([]);
    for (const id of [added.value.id, 0, -1, 1.5, NaN]) {
      expect(removePantryItem(TEST_USER_ID, id, db)).toMatchObject({
        ok: false,
        error: { kind: "not_found" },
      });
    }
  });
});

describe("clearPantry", () => {
  it("tømmer bare brukerens egen liste og sier hvor mange som ble borte", () => {
    db.$client
      .prepare(
        "insert into users (id, email, password_hash, created_at) values (2, 'annen@example.com', 'x', 'x')",
      )
      .run();
    addPantryItem(TEST_USER_ID, "Salt", db);
    addPantryItem(TEST_USER_ID, "Olje", db);
    addPantryItem(2, "Sukker", db);
    expect(clearPantry(TEST_USER_ID, db)).toEqual({ ok: true, value: { removed: 2 } });
    expect(names()).toEqual([]);
    const other = listPantry(2, db);
    expect(other.ok && other.value.map((item) => item.name)).toEqual(["Sukker"]);
    expect(clearPantry(TEST_USER_ID, db)).toEqual({ ok: true, value: { removed: 0 } });
  });
});
