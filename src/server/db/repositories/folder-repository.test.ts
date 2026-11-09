import { describe, expect, it } from "vitest";
import { createTestDb } from "../client";
import {
  assignRecipeToFolder,
  assignRecipeToNewFolder,
  deleteFolder,
  findFolderById,
  findFolderByNameKey,
  insertFolder,
  listFolders,
  listRecipesInFolder,
  renameFolder,
  type NewFolder,
} from "./folder-repository";
import {
  deleteRecipeById,
  findRecipeById,
  insertRecipe,
  listSavedRecipes,
  updateRecipe,
  updateSelectedServings,
  type NewRecipe,
} from "./recipe-repository";

const T0 = "2026-11-09T10:00:00.000Z";

const recipe = (
  title: string,
  savedAt: string | null,
  extra: Partial<NewRecipe> = {},
): NewRecipe => ({
  title,
  sourceUrl: null,
  sourceName: null,
  originalServings: 4,
  selectedServings: null,
  savedAt,
  createdAt: T0,
  updatedAt: T0,
  ingredients: [
    {
      position: 0,
      section: null,
      original: "3 egg",
      quantity: { min: 3 },
      unit: null,
      name: "egg",
      parseable: true,
    },
  ],
  steps: [{ position: 0, section: null, text: "Visp." }],
  ...extra,
});

const folder = (name: string): NewFolder => ({
  name,
  nameKey: name.toLocaleLowerCase("nb"),
  createdAt: T0,
});

function count(db: ReturnType<typeof createTestDb>, table: string): number {
  return (db.$client.prepare(`select count(*) as n from ${table}`).get() as { n: number }).n;
}

function updatedAtOf(db: ReturnType<typeof createTestDb>, id: number): string | undefined {
  return findRecipeById(db, id)?.updatedAt;
}

describe("insertFolder, findFolderById, findFolderByNameKey", () => {
  it("lagrer en mappe og finner den på id og navnenøkkel", () => {
    const db = createTestDb();
    const id = insertFolder(db, folder("Hverdag"));
    expect(findFolderById(db, id)).toEqual({ id, name: "Hverdag" });
    expect(findFolderByNameKey(db, "hverdag")).toEqual({ id, name: "Hverdag" });
    expect(findFolderById(db, 999)).toBeNull();
    expect(findFolderByNameKey(db, "finnes-ikke")).toBeNull();
  });

  it("avviser en mappe med samme navnenøkkel (unik indeks)", () => {
    const db = createTestDb();
    insertFolder(db, folder("Hverdag"));
    expect(() => insertFolder(db, { ...folder("HVERDAG"), nameKey: "hverdag" })).toThrow(/UNIQUE/);
    expect(count(db, "folders")).toBe(1);
  });
});

describe("renameFolder", () => {
  it("endrer navn og nøkkel, og returnerer false for ukjent id", () => {
    const db = createTestDb();
    const id = insertFolder(db, folder("Hverdag"));
    expect(renameFolder(db, id, { name: "Hverdagsmat", nameKey: "hverdagsmat" })).toBe(true);
    expect(findFolderById(db, id)).toEqual({ id, name: "Hverdagsmat" });
    expect(findFolderByNameKey(db, "hverdag")).toBeNull();
    expect(renameFolder(db, 999, { name: "X", nameKey: "x" })).toBe(false);
  });

  it("rører ikke updatedAt på oppskriftene i mappen", () => {
    const db = createTestDb();
    const folderId = insertFolder(db, folder("Hverdag"));
    const id = insertRecipe(db, recipe("Pannekaker", T0));
    assignRecipeToFolder(db, id, folderId);
    renameFolder(db, folderId, { name: "Helg", nameKey: "helg" });
    expect(updatedAtOf(db, id)).toBe(T0);
    expect(listSavedRecipes(db)[0].folderName).toBe("Helg");
  });
});

describe("deleteFolder", () => {
  it("sletter mappen og beholder oppskriftene, med folder_id NULL (via fremmednøkkelen)", () => {
    const db = createTestDb();
    const folderId = insertFolder(db, folder("Hverdag"));
    const ids = [1, 2, 3].map((n) =>
      insertRecipe(db, recipe(`R${n}`, `2026-11-09T1${n}:00:00.000Z`)),
    );
    for (const id of ids) assignRecipeToFolder(db, id, folderId);
    const other = insertFolder(db, folder("Helg"));
    const stays = insertRecipe(db, recipe("Blir i Helg", T0));
    assignRecipeToFolder(db, stays, other);

    expect(deleteFolder(db, folderId)).toBe(true);

    expect(findFolderById(db, folderId)).toBeNull();
    expect(count(db, "recipes")).toBe(4);
    expect(count(db, "ingredient_lines")).toBe(4);
    expect(count(db, "steps")).toBe(4);
    for (const id of ids) {
      expect(findRecipeById(db, id)).toMatchObject({ folderId: null, updatedAt: T0 });
    }
    expect(findRecipeById(db, stays)?.folderId).toBe(other);
    expect(listSavedRecipes(db).filter((r) => r.folderName !== null)).toHaveLength(1);
    expect(listSavedRecipes(db).filter((r) => r.folderName === null)).toHaveLength(3);
  });

  it("returnerer false for ukjent id og endrer ingenting", () => {
    const db = createTestDb();
    insertFolder(db, folder("Hverdag"));
    expect(deleteFolder(db, 999)).toBe(false);
    expect(count(db, "folders")).toBe(1);
  });
});

describe("listFolders", () => {
  it("teller oppskrifter per mappe, med 0 for en tom mappe", () => {
    const db = createTestDb();
    const a = insertFolder(db, folder("Hverdag"));
    const b = insertFolder(db, folder("Helg"));
    insertFolder(db, folder("Tom"));
    const r1 = insertRecipe(db, recipe("R1", T0));
    const r2 = insertRecipe(db, recipe("R2", T0));
    const r3 = insertRecipe(db, recipe("R3", T0));
    insertRecipe(db, recipe("Uten mappe", T0));
    assignRecipeToFolder(db, r1, a);
    assignRecipeToFolder(db, r2, a);
    assignRecipeToFolder(db, r3, b);

    expect(listFolders(db)).toEqual([
      { id: a, name: "Hverdag", recipeCount: 2 },
      { id: b, name: "Helg", recipeCount: 1 },
      { id: 3, name: "Tom", recipeCount: 0 },
    ]);
  });

  it("tellingen går ned når en oppskrift i mappen slettes, og mappen står igjen", () => {
    const db = createTestDb();
    const folderId = insertFolder(db, folder("Hverdag"));
    const id = insertRecipe(db, recipe("R1", T0));
    assignRecipeToFolder(db, id, folderId);
    deleteRecipeById(db, id);
    expect(listFolders(db)).toEqual([{ id: folderId, name: "Hverdag", recipeCount: 0 }]);
  });

  it("er tom uten mapper", () => {
    expect(listFolders(createTestDb())).toEqual([]);
  });
});

describe("listRecipesInFolder", () => {
  it("gir oppsummeringer i samme rekkefølge som samlingen (sist lagret først, så høyest id)", () => {
    const db = createTestDb();
    const folderId = insertFolder(db, folder("Hverdag"));
    const old = insertRecipe(
      db,
      recipe("Eldst", "2026-11-09T09:00:00.000Z", { sourceName: "Matprat" }),
    );
    const same1 = insertRecipe(db, recipe("Samme 1", "2026-11-09T11:00:00.000Z"));
    const same2 = insertRecipe(db, recipe("Samme 2", "2026-11-09T11:00:00.000Z"));
    insertRecipe(db, recipe("Annen mappe", "2026-11-09T12:00:00.000Z"));
    for (const id of [old, same1, same2]) assignRecipeToFolder(db, id, folderId);

    const inFolder = listRecipesInFolder(db, folderId);
    expect(inFolder.map((r) => r.title)).toEqual(["Samme 2", "Samme 1", "Eldst"]);
    expect(inFolder[2]).toEqual({
      id: old,
      title: "Eldst",
      sourceName: "Matprat",
      sourceUrl: null,
      savedAt: "2026-11-09T09:00:00.000Z",
      isFavorite: false,
      folderName: "Hverdag",
    });
    expect(listRecipesInFolder(db, 999)).toEqual([]);
  });
});

describe("assignRecipeToFolder", () => {
  it("legger en lagret oppskrift i mappen, flytter den og tar den ut igjen med null", () => {
    const db = createTestDb();
    const a = insertFolder(db, folder("Hverdag"));
    const b = insertFolder(db, folder("Helg"));
    const id = insertRecipe(db, recipe("R", T0));

    expect(assignRecipeToFolder(db, id, a)).toBe(true);
    expect(findRecipeById(db, id)?.folderId).toBe(a);
    expect(assignRecipeToFolder(db, id, b)).toBe(true);
    expect(findRecipeById(db, id)?.folderId).toBe(b);
    expect(listFolders(db).map((f) => f.recipeCount)).toEqual([0, 1]);
    expect(assignRecipeToFolder(db, id, null)).toBe(true);
    expect(findRecipeById(db, id)?.folderId).toBeNull();
  });

  it("rører ikke updatedAt eller selectedServings", () => {
    const db = createTestDb();
    const folderId = insertFolder(db, folder("Hverdag"));
    const id = insertRecipe(db, recipe("R", T0, { selectedServings: 6 }));
    assignRecipeToFolder(db, id, folderId);
    assignRecipeToFolder(db, id, null);
    expect(findRecipeById(db, id)).toMatchObject({ updatedAt: T0, selectedServings: 6 });
  });

  it("returnerer false og endrer ingenting for en oppskrift som ikke er lagret eller ikke finnes", () => {
    const db = createTestDb();
    const folderId = insertFolder(db, folder("Hverdag"));
    const unsaved = insertRecipe(db, recipe("Ulagret", null));
    expect(assignRecipeToFolder(db, unsaved, folderId)).toBe(false);
    expect(findRecipeById(db, unsaved)?.folderId).toBeNull();
    expect(assignRecipeToFolder(db, 999, folderId)).toBe(false);
  });

  it("kaster for en mappe som ikke finnes (fremmednøkkel)", () => {
    const db = createTestDb();
    const id = insertRecipe(db, recipe("R", T0));
    expect(() => assignRecipeToFolder(db, id, 999)).toThrow(/FOREIGN KEY/);
    expect(findRecipeById(db, id)?.folderId).toBeNull();
  });
});

describe("assignRecipeToNewFolder", () => {
  it("oppretter mappen og flytter oppskriften, uten å røre updatedAt", () => {
    const db = createTestDb();
    const id = insertRecipe(db, recipe("R", T0));
    const folderId = assignRecipeToNewFolder(db, id, folder("Fest"));
    expect(folderId).not.toBeNull();
    expect(findFolderById(db, folderId!)).toEqual({ id: folderId, name: "Fest" });
    expect(findRecipeById(db, id)).toMatchObject({ folderId, updatedAt: T0 });
  });

  it("oppretter ingen mappe når oppskriften ikke er lagret eller ikke finnes", () => {
    const db = createTestDb();
    const unsaved = insertRecipe(db, recipe("Ulagret", null));
    expect(assignRecipeToNewFolder(db, unsaved, folder("Fest"))).toBeNull();
    expect(assignRecipeToNewFolder(db, 999, folder("Fest"))).toBeNull();
    expect(count(db, "folders")).toBe(0);
  });

  it("opptatt navn: kaster, og ingenting endres", () => {
    const db = createTestDb();
    insertFolder(db, folder("Fest"));
    const id = insertRecipe(db, recipe("R", T0));
    expect(() => assignRecipeToNewFolder(db, id, folder("Fest"))).toThrow(/UNIQUE/);
    expect(count(db, "folders")).toBe(1);
    expect(findRecipeById(db, id)?.folderId).toBeNull();
  });

  it("feiler flyttingen, rulles mappen tilbake (ingen halv mappe)", () => {
    const db = createTestDb();
    const id = insertRecipe(db, recipe("R", T0));
    db.$client.exec(
      "create trigger stopp before update on recipes begin select raise(abort, 'stoppet'); end",
    );
    expect(() => assignRecipeToNewFolder(db, id, folder("Fest"))).toThrow(/stoppet/);
    expect(count(db, "folders")).toBe(0);
    expect(findRecipeById(db, id)?.folderId).toBeNull();
  });
});

describe("mappe og andre oppskriftshandlinger", () => {
  it("redigering (updateRecipe) rører ikke folder_id", () => {
    const db = createTestDb();
    const folderId = insertFolder(db, folder("Hverdag"));
    const id = insertRecipe(db, recipe("R", T0));
    assignRecipeToFolder(db, id, folderId);
    updateRecipe(db, id, {
      title: "Endret",
      originalServings: 2,
      updatedAt: "2026-11-10T10:00:00.000Z",
      ingredients: [],
      steps: [],
    });
    expect(findRecipeById(db, id)).toMatchObject({ title: "Endret", folderId });
  });

  it("valgt antall rører ikke folder_id", () => {
    const db = createTestDb();
    const folderId = insertFolder(db, folder("Hverdag"));
    const id = insertRecipe(db, recipe("R", T0));
    assignRecipeToFolder(db, id, folderId);
    updateSelectedServings(db, id, 6);
    expect(findRecipeById(db, id)?.folderId).toBe(folderId);
  });

  it("listSavedRecipes gir folderName (null uten mappe) og utelater ulagrede", () => {
    const db = createTestDb();
    const folderId = insertFolder(db, folder("Hverdag"));
    const a = insertRecipe(db, recipe("I mappe", "2026-11-09T11:00:00.000Z"));
    insertRecipe(db, recipe("Uten", "2026-11-09T10:00:00.000Z"));
    insertRecipe(db, recipe("Ulagret", null));
    assignRecipeToFolder(db, a, folderId);
    expect(listSavedRecipes(db).map((r) => [r.title, r.folderName])).toEqual([
      ["I mappe", "Hverdag"],
      ["Uten", null],
    ]);
  });
});
