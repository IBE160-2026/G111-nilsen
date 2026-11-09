import { describe, expect, it } from "vitest";
import { createTestDb } from "../db/client";
import { findFolderById } from "../db/repositories/folder-repository";
import { findRecipeById, insertRecipe, type NewRecipe } from "../db/repositories/recipe-repository";
import {
  createFolder,
  deleteFolder,
  getFolderWithRecipes,
  listFolders,
  moveRecipeToFolder,
  moveRecipeToNewFolder,
  renameFolder,
} from "./folder-service";
import { createManualRecipe } from "./recipe-service";

const T0 = "2026-11-09T10:00:00.000Z";

const recipe = (title: string, savedAt: string | null): NewRecipe => ({
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
});

const notFound = { ok: false, error: { kind: "not_found" } };
const invalid = (detail: string) => ({ ok: false, error: { kind: "validation", detail } });

function count(db: ReturnType<typeof createTestDb>, table: string): number {
  return (db.$client.prepare(`select count(*) as n from ${table}`).get() as { n: number }).n;
}

function names(db: ReturnType<typeof createTestDb>): string[] {
  const result = listFolders(db);
  if (!result.ok) throw new Error("kunne ikke liste mapper");
  return result.value.map((f) => f.name);
}

describe("createFolder (navneregler)", () => {
  it("oppretter en mappe og returnerer id og navn", () => {
    const db = createTestDb();
    const result = createFolder("Hverdag", db);
    expect(result).toEqual({ ok: true, value: { id: 1, name: "Hverdag" } });
    expect(names(db)).toEqual(["Hverdag"]);
  });

  it("trimmer og slår sammen blanke tegn: «  Ny   helg  » lagres som «Ny helg»", () => {
    const db = createTestDb();
    expect(createFolder("  Ny   helg  ", db)).toMatchObject({
      ok: true,
      value: { name: "Ny helg" },
    });
    expect(names(db)).toEqual(["Ny helg"]);
  });

  it.each(["", "   ", "\t\n"])("%j gir name_required, og ingenting lagres", (name) => {
    const db = createTestDb();
    expect(createFolder(name, db)).toEqual(invalid("name_required"));
    expect(count(db, "folders")).toBe(0);
  });

  it("40 tegn godtas, 41 gir name_too_long", () => {
    const db = createTestDb();
    expect(createFolder("a".repeat(40), db).ok).toBe(true);
    expect(createFolder("b".repeat(41), db)).toEqual(invalid("name_too_long"));
    expect(count(db, "folders")).toBe(1);
  });

  it("lengden telles i Unicode-tegn: 40 emoji godtas, 41 gir name_too_long", () => {
    const db = createTestDb();
    expect(createFolder("🍝".repeat(40), db).ok).toBe(true);
    expect(createFolder("🍕".repeat(41), db)).toEqual(invalid("name_too_long"));
  });

  it("lengden telles etter trimming og sammenslåing av blanke tegn", () => {
    const db = createTestDb();
    expect(createFolder(`  ${"a".repeat(40)}  `, db).ok).toBe(true);
    expect(createFolder(`${"b ".repeat(20)}`.trim().replace(/ /g, "   "), db).ok).toBe(true);
  });

  it.each([
    ["hverdag", "Hverdag"],
    ["HVERDAG", "Hverdag"],
    ["ÆRLIG", "ærlig"],
    ["ærlig", "ÆRLIG"],
    ["Ny  helg", "ny helg"],
    ["årstid", "årstid"],
  ])(
    "«%s» er opptatt når «%s» finnes (uten hensyn til store og små bokstaver)",
    (taken, existing) => {
      const db = createTestDb();
      expect(createFolder(existing, db).ok).toBe(true);
      expect(createFolder(taken, db)).toEqual(invalid("name_taken"));
      expect(count(db, "folders")).toBe(1);
    },
  );

  it("ikke-tekst gir name_required", () => {
    expect(createFolder(undefined as unknown as string, createTestDb())).toEqual(
      invalid("name_required"),
    );
  });
});

describe("renameFolder", () => {
  it("gir nytt navn", () => {
    const db = createTestDb();
    createFolder("Hverdag", db);
    expect(renameFolder(1, "Hverdagsmat", db)).toEqual({
      ok: true,
      value: { id: 1, name: "Hverdagsmat" },
    });
    expect(names(db)).toEqual(["Hverdagsmat"]);
  });

  it("å endre bare store og små bokstaver er lov (egen id ekskluderes)", () => {
    const db = createTestDb();
    createFolder("Hverdag", db);
    expect(renameFolder(1, "HVERDAG", db)).toEqual({ ok: true, value: { id: 1, name: "HVERDAG" } });
    expect(findFolderById(db, 1)?.name).toBe("HVERDAG");
  });

  it("navnet til en annen mappe gir name_taken, og ingenting endres", () => {
    const db = createTestDb();
    createFolder("Hverdag", db);
    createFolder("Helg", db);
    expect(renameFolder(2, "hverdag", db)).toEqual(invalid("name_taken"));
    expect(names(db)).toEqual(["Helg", "Hverdag"]);
  });

  it.each([
    ["", "name_required"],
    ["a".repeat(41), "name_too_long"],
  ])("ugyldig navn %j gir %s", (name, detail) => {
    const db = createTestDb();
    createFolder("Hverdag", db);
    expect(renameFolder(1, name, db)).toEqual(invalid(detail));
    expect(findFolderById(db, 1)?.name).toBe("Hverdag");
  });

  it.each([999, 0, -1, 1.5, NaN])("ukjent eller ugyldig id %s gir not_found", (id) => {
    expect(renameFolder(id, "Navn", createTestDb())).toEqual(notFound);
  });
});

describe("deleteFolder", () => {
  it("sletter mappen og beholder oppskriftene uten mappe", () => {
    const db = createTestDb();
    createFolder("Hverdag", db);
    const id = insertRecipe(db, recipe("R", T0));
    moveRecipeToFolder(id, 1, db);
    expect(deleteFolder(1, db)).toEqual({ ok: true, value: { id: 1 } });
    expect(findFolderById(db, 1)).toBeNull();
    expect(findRecipeById(db, id)).toMatchObject({ folderId: null, updatedAt: T0 });
  });

  it.each([999, 0, -1, 1.5, NaN])("ukjent eller ugyldig id %s gir not_found", (id) => {
    expect(deleteFolder(id, createTestDb())).toEqual(notFound);
  });
});

describe("listFolders", () => {
  it("sorterer alfabetisk etter norske regler (æ, ø, å sist, uten hensyn til store og små bokstaver)", () => {
    const db = createTestDb();
    for (const name of ["Åpent", "ærlig", "Zebra", "bakst", "Øl", "Apple", "Aften"])
      createFolder(name, db);
    expect(names(db)).toEqual(["Aften", "Apple", "bakst", "Zebra", "ærlig", "Øl", "Åpent"]);
  });

  it("gir antall oppskrifter per mappe", () => {
    const db = createTestDb();
    createFolder("Hverdag", db);
    createFolder("Helg", db);
    const id = insertRecipe(db, recipe("R", T0));
    moveRecipeToFolder(id, 1, db);
    expect(listFolders(db)).toEqual({
      ok: true,
      value: [
        { id: 2, name: "Helg", recipeCount: 0 },
        { id: 1, name: "Hverdag", recipeCount: 1 },
      ],
    });
  });
});

describe("getFolderWithRecipes", () => {
  it("gir mappen og oppskriftene i den, sist lagret først", () => {
    const db = createTestDb();
    createFolder("Hverdag", db);
    const a = insertRecipe(db, recipe("Eldst", "2026-11-09T09:00:00.000Z"));
    const b = insertRecipe(db, recipe("Nyest", "2026-11-09T11:00:00.000Z"));
    insertRecipe(db, recipe("Utenfor", "2026-11-09T12:00:00.000Z"));
    moveRecipeToFolder(a, 1, db);
    moveRecipeToFolder(b, 1, db);
    const result = getFolderWithRecipes(1, db);
    expect(result.ok && result.value.folder).toEqual({ id: 1, name: "Hverdag" });
    expect(result.ok && result.value.recipes.map((r) => r.title)).toEqual(["Nyest", "Eldst"]);
  });

  it("tom mappe gir tom liste", () => {
    const db = createTestDb();
    createFolder("Tom", db);
    expect(getFolderWithRecipes(1, db)).toEqual({
      ok: true,
      value: { folder: { id: 1, name: "Tom" }, recipes: [] },
    });
  });

  it.each([999, 0, -1, 1.5, NaN])("ukjent eller ugyldig id %s gir not_found", (id) => {
    expect(getFolderWithRecipes(id, createTestDb())).toEqual(notFound);
  });
});

describe("moveRecipeToFolder", () => {
  it("legger en lagret oppskrift i mappen, flytter den og tar den ut med null", () => {
    const db = createTestDb();
    createFolder("Hverdag", db);
    createFolder("Helg", db);
    const id = insertRecipe(db, recipe("R", T0));
    expect(moveRecipeToFolder(id, 1, db)).toEqual({
      ok: true,
      value: { folder: { id: 1, name: "Hverdag" } },
    });
    expect(moveRecipeToFolder(id, 2, db)).toEqual({
      ok: true,
      value: { folder: { id: 2, name: "Helg" } },
    });
    expect(findRecipeById(db, id)?.folderId).toBe(2);
    expect(moveRecipeToFolder(id, null, db)).toEqual({ ok: true, value: { folder: null } });
    expect(findRecipeById(db, id)?.folderId).toBeNull();
  });

  it("å velge samme mappe på nytt er trygt og endrer ikke updatedAt", () => {
    const db = createTestDb();
    createFolder("Hverdag", db);
    const id = insertRecipe(db, recipe("R", T0));
    moveRecipeToFolder(id, 1, db);
    expect(moveRecipeToFolder(id, 1, db).ok).toBe(true);
    expect(findRecipeById(db, id)).toMatchObject({ folderId: 1, updatedAt: T0 });
  });

  it("oppskrift som ikke er i samlingen gir not_found, og ingenting endres", () => {
    const db = createTestDb();
    createFolder("Hverdag", db);
    const id = insertRecipe(db, recipe("Ulagret", null));
    expect(moveRecipeToFolder(id, 1, db)).toEqual(notFound);
    expect(findRecipeById(db, id)?.folderId).toBeNull();
  });

  it.each([
    ["ukjent oppskrift", 999, 1],
    ["ugyldig oppskrift", 0, 1],
    ["ukjent mappe", 1, 999],
    ["ugyldig mappe", 1, 0],
    ["ugyldig mappe", 1, 1.5],
  ])("%s gir not_found", (_, recipeId, folderId) => {
    const db = createTestDb();
    createFolder("Hverdag", db);
    insertRecipe(db, recipe("R", T0));
    expect(moveRecipeToFolder(recipeId, folderId, db)).toEqual(notFound);
    expect(findRecipeById(db, 1)?.folderId).toBeNull();
  });

  it("fungerer for en oppskrift laget med createManualRecipe (lagret rett i samlingen)", () => {
    const db = createTestDb();
    createFolder("Hverdag", db);
    const created = createManualRecipe(
      { title: "Pannekaker", servings: 4, ingredients: ["3 egg"], steps: [] },
      db,
    );
    if (!created.ok) throw new Error("kunne ikke lagre");
    expect(moveRecipeToFolder(created.value.id, 1, db).ok).toBe(true);
  });
});

describe("moveRecipeToNewFolder", () => {
  it("oppretter mappen og flytter oppskriften", () => {
    const db = createTestDb();
    const id = insertRecipe(db, recipe("R", T0));
    expect(moveRecipeToNewFolder(id, "  Fest  ", db)).toEqual({
      ok: true,
      value: { folder: { id: 1, name: "Fest" } },
    });
    expect(findRecipeById(db, id)).toMatchObject({ folderId: 1, updatedAt: T0 });
  });

  it.each([
    ["", "name_required"],
    ["a".repeat(41), "name_too_long"],
  ])("ugyldig navn %j gir %s, og ingen mappe opprettes", (name, detail) => {
    const db = createTestDb();
    const id = insertRecipe(db, recipe("R", T0));
    expect(moveRecipeToNewFolder(id, name, db)).toEqual(invalid(detail));
    expect(count(db, "folders")).toBe(0);
    expect(findRecipeById(db, id)?.folderId).toBeNull();
  });

  it("opptatt navn gir name_taken, og oppskriften blir der den var", () => {
    const db = createTestDb();
    createFolder("Fest", db);
    const id = insertRecipe(db, recipe("R", T0));
    expect(moveRecipeToNewFolder(id, "FEST", db)).toEqual(invalid("name_taken"));
    expect(count(db, "folders")).toBe(1);
    expect(findRecipeById(db, id)?.folderId).toBeNull();
  });

  it("oppskrift som ikke er lagret eller ikke finnes gir not_found, og ingen mappe opprettes", () => {
    const db = createTestDb();
    const unsaved = insertRecipe(db, recipe("Ulagret", null));
    expect(moveRecipeToNewFolder(unsaved, "Fest", db)).toEqual(notFound);
    expect(moveRecipeToNewFolder(999, "Fest", db)).toEqual(notFound);
    expect(moveRecipeToNewFolder(0, "Fest", db)).toEqual(notFound);
    expect(count(db, "folders")).toBe(0);
  });

  it("databasefeil midt i transaksjonen: ingen halv mappe", () => {
    const db = createTestDb();
    const id = insertRecipe(db, recipe("R", T0));
    db.$client.exec(
      "create trigger stopp before update on recipes begin select raise(abort, 'x'); end",
    );
    expect(() => moveRecipeToNewFolder(id, "Fest", db)).toThrow();
    expect(count(db, "folders")).toBe(0);
  });
});
