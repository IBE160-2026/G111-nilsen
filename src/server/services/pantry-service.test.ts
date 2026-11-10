import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type Db } from "../db/client";
import { addPantryItem, listPantry, removePantryItem } from "./pantry-service";

let db: Db;
beforeEach(() => {
  db = createTestDb();
});

const names = () => {
  const result = listPantry(db);
  if (!result.ok) throw new Error("kunne ikke lese");
  return result.value.map((item) => item.name);
};

describe("pantry-service", () => {
  it("er tom til noe legges til, og lister sortert på navn", () => {
    expect(names()).toEqual([]);
    addPantryItem("Salt", db);
    addPantryItem("Olivenolje", db);
    expect(names()).toEqual(["Olivenolje", "Salt"]);
  });

  it("rydder navnet: trimmer og samler mellomrom", () => {
    const added = addPantryItem("   hvete   mel ", db);
    expect(added).toMatchObject({ ok: true, value: { name: "hvete mel" } });
  });

  it("samme navn to ganger, også med andre store bokstaver, gir den som finnes", () => {
    const first = addPantryItem("Salt", db);
    const second = addPantryItem("  SALT ", db);
    expect(first.ok && second.ok && first.value.id === second.value.id).toBe(true);
    expect(names()).toEqual(["Salt"]);
  });

  it("avviser tomt og for langt navn uten å lagre", () => {
    expect(addPantryItem("   ", db)).toMatchObject({
      ok: false,
      error: { kind: "validation", detail: "name_required" },
    });
    expect(addPantryItem("a".repeat(61), db)).toMatchObject({
      ok: false,
      error: { kind: "validation", detail: "name_too_long" },
    });
    expect(addPantryItem("a".repeat(60), db).ok).toBe(true);
    expect(names()).toHaveLength(1);
  });

  it("bruker klokken som er gitt til tidspunktet", () => {
    addPantryItem("Salt", db, () => new Date("2026-11-10T12:00:00.000Z"));
    expect(db.$client.prepare("select created_at as t from pantry_items").get()).toEqual({
      t: "2026-11-10T12:00:00.000Z",
    });
  });

  it("fjerner en oppføring, og ukjent eller ugyldig id gir not_found", () => {
    const added = addPantryItem("Salt", db);
    if (!added.ok) throw new Error("feil");
    expect(removePantryItem(added.value.id, db)).toEqual({
      ok: true,
      value: { id: added.value.id },
    });
    expect(names()).toEqual([]);
    for (const id of [added.value.id, 0, -1, 1.5, NaN]) {
      expect(removePantryItem(id, db)).toMatchObject({ ok: false, error: { kind: "not_found" } });
    }
  });
});
