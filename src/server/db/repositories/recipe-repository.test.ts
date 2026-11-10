import { TEST_USER_ID } from "@/server/db/client";
import { describe, expect, it } from "vitest";
import { createTestDb } from "../client";
import { assignRecipeToFolder, insertFolder } from "./folder-repository";
import {
  deleteRecipeById,
  deleteStaleUnsavedRecipes,
  findRecipeById,
  findRecipeOwner,
  findRecipeBySourceUrl,
  insertImportedRecipe,
  insertRecipe,
  listFavoriteRecipes,
  listSavedIngredientNames,
  listSavedRecipes,
  markRecipeSaved,
  setRecipeFavorite,
  updateRecipe,
  updateOriginalServings,
  updateSelectedServings,
  type NewRecipe,
  type RecipeUpdate,
} from "./recipe-repository";

const base: NewRecipe = {
  title: "Pannekaker",
  sourceUrl: null,
  sourceName: null,
  originalServings: 4,
  selectedServings: null,
  savedAt: null,
  createdAt: "2026-11-09T10:00:00.000Z",
  updatedAt: "2026-11-09T10:00:00.000Z",
  userId: TEST_USER_ID,
  ingredients: [
    {
      position: 1,
      section: null,
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
    { position: 0, section: null, text: "Rør." },
  ],
};

function count(db: ReturnType<typeof createTestDb>, table: string): number {
  return (db.$client.prepare(`select count(*) as n from ${table}`).get() as { n: number }).n;
}

describe("recipe-repository", () => {
  it("lagrer og henter en oppskrift med linjer og steg sortert på position", () => {
    const db = createTestDb();
    const id = insertRecipe(db, base);
    const recipe = findRecipeById(db, id);

    expect(recipe).toMatchObject({
      id,
      title: "Pannekaker",
      originalServings: 4,
      selectedServings: null,
      savedAt: null,
      sourceName: null,
      createdAt: "2026-11-09T10:00:00.000Z",
    });
    expect(recipe?.ingredients.map((l) => l.original)).toEqual(["2–3 ss sukker", "salt"]);
    expect(recipe?.ingredients[0]).toMatchObject({
      quantity: { min: 2, max: 3 },
      unit: "ss",
      name: "sukker",
      parseable: true,
      section: null,
    });
    expect(recipe?.ingredients[1]).toMatchObject({ quantity: null, unit: null, parseable: false });
    expect(recipe?.steps.map((s) => s.text)).toEqual(["Rør.", "Stek."]);
  });

  it("gjør quantityMin uten quantityMax om til Quantity uten max", () => {
    const db = createTestDb();
    const id = insertRecipe(db, {
      ...base,
      ingredients: [{ ...base.ingredients[1], quantity: { min: 400 }, unit: "g" }],
    });
    const quantity = findRecipeById(db, id)?.ingredients[0].quantity;
    expect(quantity).toEqual({ min: 400 });
    expect(quantity && "max" in quantity).toBe(false);
  });

  it("valgfrie felt (porsjonsantall, kilde) kan mangle", () => {
    const db = createTestDb();
    const id = insertRecipe(db, { ...base, originalServings: null, steps: [] });
    expect(findRecipeById(db, id)).toMatchObject({ originalServings: null, steps: [] });
  });

  it("ruller tilbake hele oppskriften når en linje feiler", () => {
    const db = createTestDb();
    const broken = {
      ...base,
      steps: [{ position: 0, section: null, text: null as unknown as string }],
    };
    expect(() => insertRecipe(db, broken)).toThrow();
    expect(count(db, "recipes")).toBe(0);
    expect(count(db, "ingredient_lines")).toBe(0);
    expect(count(db, "steps")).toBe(0);
  });

  it("returnerer null for ukjent id", () => {
    expect(findRecipeById(createTestDb(), 999999)).toBeNull();
  });

  it("sletting av oppskriften sletter linjer og steg (cascade)", () => {
    const db = createTestDb();
    const id = insertRecipe(db, base);
    db.$client.prepare("delete from recipes where id = ?").run(id);
    expect(count(db, "ingredient_lines")).toBe(0);
    expect(count(db, "steps")).toBe(0);
  });

  describe("updateRecipe", () => {
    const update: RecipeUpdate = {
      title: "Vafler",
      originalServings: 6,
      updatedAt: "2026-11-10T08:00:00.000Z",
      ingredients: [
        {
          position: 0,
          section: null,
          original: "1 ts salt",
          quantity: { min: 1 },
          unit: "ts",
          name: "salt",
          parseable: true,
        },
      ],
      steps: [{ position: 0, section: null, text: "Stek vaflene." }],
    };

    function saved() {
      const db = createTestDb();
      const id = insertRecipe(db, {
        ...base,
        sourceUrl: "https://www.matprat.no/x",
        sourceName: "Matprat",
        selectedServings: 8,
        savedAt: "2026-11-09T11:00:00.000Z",
      });
      return { db, id };
    }

    it("erstatter tittel, antall, linjer og steg og setter updatedAt", () => {
      const { db, id } = saved();
      expect(updateRecipe(db, id, update)).toBe(true);
      const recipe = findRecipeById(db, id);
      expect(recipe).toMatchObject({ title: "Vafler", originalServings: 6 });
      expect(recipe?.updatedAt).toBe("2026-11-10T08:00:00.000Z");
      expect(recipe?.ingredients.map((l) => [l.original, l.quantity, l.unit])).toEqual([
        ["1 ts salt", { min: 1 }, "ts"],
      ]);
      expect(recipe?.steps.map((s) => s.text)).toEqual(["Stek vaflene."]);
      expect(count(db, "ingredient_lines")).toBe(1);
      expect(count(db, "steps")).toBe(1);
    });

    it("lar id, kilde, savedAt og createdAt stå uendret", () => {
      const { db, id } = saved();
      updateRecipe(db, id, update);
      expect(findRecipeById(db, id)).toMatchObject({
        id,
        sourceUrl: "https://www.matprat.no/x",
        sourceName: "Matprat",
        savedAt: "2026-11-09T11:00:00.000Z",
        createdAt: "2026-11-09T10:00:00.000Z",
      });
    });

    it("nullstiller selectedServings når originalServings endres", () => {
      const { db, id } = saved();
      updateRecipe(db, id, update);
      expect(findRecipeById(db, id)?.selectedServings).toBeNull();
    });

    it("beholder selectedServings når originalServings er uendret", () => {
      const { db, id } = saved();
      updateRecipe(db, id, { ...update, originalServings: 4 });
      expect(findRecipeById(db, id)?.selectedServings).toBe(8);
    });

    it("nullstiller selectedServings når originalServings går fra null til et tall", () => {
      const db = createTestDb();
      const id = insertRecipe(db, { ...base, originalServings: null, selectedServings: 3 });
      updateRecipe(db, id, update);
      expect(findRecipeById(db, id)).toMatchObject({ originalServings: 6, selectedServings: null });
    });

    it.each([
      ["selve oppdateringen av recipes", "before update on recipes"],
      ["innsettingen av ingredienser", "before insert on ingredient_lines"],
    ])("ruller tilbake alt ved feil i %s", (_, trigger) => {
      const { db, id } = saved();
      const before = findRecipeById(db, id);
      db.$client.exec(`create trigger fail ${trigger} begin select raise(abort, 'feil'); end`);
      expect(() => updateRecipe(db, id, update)).toThrow();
      expect(findRecipeById(db, id)).toEqual(before);
      expect(count(db, "ingredient_lines")).toBe(2);
      expect(count(db, "steps")).toBe(2);
    });

    it("kan fjerne alle steg", () => {
      const { db, id } = saved();
      updateRecipe(db, id, { ...update, steps: [] });
      expect(findRecipeById(db, id)?.steps).toEqual([]);
    });

    it("returnerer false for ukjent id og endrer ingenting", () => {
      const { db, id } = saved();
      expect(updateRecipe(db, 999999, update)).toBe(false);
      expect(findRecipeById(db, id)?.title).toBe("Pannekaker");
      expect(count(db, "recipes")).toBe(1);
    });

    it("ruller tilbake alt når et steg feiler midt i oppdateringen", () => {
      const { db, id } = saved();
      const before = findRecipeById(db, id);
      const broken = {
        ...update,
        steps: [{ position: 0, section: null, text: null as unknown as string }],
      };
      expect(() => updateRecipe(db, id, broken)).toThrow();
      expect(findRecipeById(db, id)).toEqual(before);
      expect(count(db, "ingredient_lines")).toBe(2);
      expect(count(db, "steps")).toBe(2);
    });
  });
});

describe("listSavedRecipes", () => {
  const at = (
    savedAt: string | null,
    title: string,
    extra: Partial<NewRecipe> = {},
  ): NewRecipe => ({
    ...base,
    title,
    savedAt,
    ...extra,
  });

  it("er tom når ingen oppskrifter finnes", () => {
    expect(listSavedRecipes(createTestDb(), TEST_USER_ID)).toEqual([]);
  });

  it("utelater oppskrifter uten savedAt", () => {
    const db = createTestDb();
    insertRecipe(db, at(null, "Ikke i samlingen", { sourceUrl: "https://a.no/x" }));
    const saved = insertRecipe(db, at("2026-11-09T10:00:00.000Z", "I samlingen"));
    expect(listSavedRecipes(db, TEST_USER_ID).map((r) => r.id)).toEqual([saved]);
  });

  it("sorterer på savedAt synkende, og på id synkende ved likt tidspunkt", () => {
    const db = createTestDb();
    const oldest = insertRecipe(db, at("2026-11-09T09:00:00.000Z", "Eldst"));
    const tieA = insertRecipe(db, at("2026-11-09T11:00:00.000Z", "Lik A"));
    const newest = insertRecipe(db, at("2026-11-09T12:00:00.000Z", "Nyest"));
    const tieB = insertRecipe(db, at("2026-11-09T11:00:00.000Z", "Lik B"));
    expect(listSavedRecipes(db, TEST_USER_ID).map((r) => r.id)).toEqual([
      newest,
      tieB,
      tieA,
      oldest,
    ]);
  });

  it("returnerer bare oppsummeringen, uten ingredienser og steg", () => {
    const db = createTestDb();
    const id = insertRecipe(
      db,
      at("2026-11-09T10:00:00.000Z", "Pannekaker", {
        sourceName: "Matprat",
        sourceUrl: "https://www.matprat.no/x",
      }),
    );
    expect(listSavedRecipes(db, TEST_USER_ID)).toEqual([
      {
        id,
        title: "Pannekaker",
        sourceName: "Matprat",
        sourceUrl: "https://www.matprat.no/x",
        savedAt: "2026-11-09T10:00:00.000Z",
        isFavorite: false,
        folderName: null,
      },
    ]);
  });
});

describe("lagre, slette og rydde (Story 3.2)", () => {
  const SAVED = "2026-11-10T08:00:00.000Z";

  describe("markRecipeSaved", () => {
    it("setter savedAt på en ulagret oppskrift uten å røre updatedAt", () => {
      const db = createTestDb();
      const id = insertRecipe(db, base);
      expect(markRecipeSaved(db, id, SAVED, TEST_USER_ID)).toBe(true);
      expect(findRecipeById(db, id)).toMatchObject({
        savedAt: SAVED,
        updatedAt: base.updatedAt,
        createdAt: base.createdAt,
      });
    });

    it("beholder savedAt når oppskriften allerede er lagret", () => {
      const db = createTestDb();
      const id = insertRecipe(db, { ...base, savedAt: "2026-11-09T11:00:00.000Z" });
      expect(markRecipeSaved(db, id, SAVED, TEST_USER_ID)).toBe(true);
      expect(findRecipeById(db, id)?.savedAt).toBe("2026-11-09T11:00:00.000Z");
    });

    it("returnerer false for ukjent id", () => {
      expect(markRecipeSaved(createTestDb(), 999, SAVED, TEST_USER_ID)).toBe(false);
    });
  });

  describe("deleteRecipeById", () => {
    it("fjerner oppskriften og bare den", () => {
      const db = createTestDb();
      const keep = insertRecipe(db, base);
      const id = insertRecipe(db, base);
      expect(deleteRecipeById(db, id)).toBe(true);
      expect(findRecipeById(db, id)).toBeNull();
      expect(findRecipeById(db, keep)).not.toBeNull();
    });

    it("kaskaderer til ingredient_lines og steps (fremmednøkler er på)", () => {
      const db = createTestDb();
      expect(db.$client.pragma("foreign_keys", { simple: true })).toBe(1);
      const keep = insertRecipe(db, base);
      const id = insertRecipe(db, base);
      expect(count(db, "ingredient_lines")).toBe(4);
      expect(count(db, "steps")).toBe(4);

      expect(deleteRecipeById(db, id)).toBe(true);
      expect(count(db, "recipes")).toBe(1);
      expect(count(db, "ingredient_lines")).toBe(2);
      expect(count(db, "steps")).toBe(2);
      expect(findRecipeById(db, keep)?.ingredients).toHaveLength(2);
    });

    it("returnerer false for ukjent id", () => {
      expect(deleteRecipeById(createTestDb(), 999)).toBe(false);
    });
  });

  describe("updateOriginalServings", () => {
    it("lagrer antallet for lagret og ulagret oppskrift, nullstiller valgt antall, rører ikke updatedAt", () => {
      const db = createTestDb();
      const saved = insertRecipe(db, { ...base, savedAt: SAVED, originalServings: null });
      const unsaved = insertRecipe(db, { ...base, originalServings: null });
      updateSelectedServings(db, saved, 6);
      for (const id of [saved, unsaved]) {
        expect(updateOriginalServings(db, id, 8)).toBe(true);
        expect(findRecipeById(db, id)).toMatchObject({
          originalServings: 8,
          selectedServings: null,
          updatedAt: base.updatedAt,
        });
      }
    });

    it("returnerer false for ukjent id", () => {
      expect(updateOriginalServings(createTestDb(), 999, 4)).toBe(false);
    });
  });

  describe("updateSelectedServings", () => {
    it("lagrer antallet for en lagret oppskrift uten å røre updatedAt eller savedAt", () => {
      const db = createTestDb();
      const id = insertRecipe(db, { ...base, savedAt: SAVED });
      expect(updateSelectedServings(db, id, 6)).toBe(true);
      expect(findRecipeById(db, id)).toMatchObject({
        selectedServings: 6,
        updatedAt: base.updatedAt,
        savedAt: SAVED,
      });
      expect(updateSelectedServings(db, id, 4)).toBe(true);
      expect(findRecipeById(db, id)?.selectedServings).toBe(4);
    });

    it("lagrer ingenting for en oppskrift som ikke er lagret", () => {
      const db = createTestDb();
      const id = insertRecipe(db, base);
      expect(updateSelectedServings(db, id, 6)).toBe(false);
      expect(findRecipeById(db, id)?.selectedServings).toBeNull();
    });

    it("returnerer false for ukjent id", () => {
      expect(updateSelectedServings(createTestDb(), 999, 6)).toBe(false);
    });
  });

  describe("deleteStaleUnsavedRecipes", () => {
    const cutoff = "2026-11-09T12:00:00.000Z";
    const created = (createdAt: string, savedAt: string | null = null) =>
      ({ ...base, createdAt, savedAt }) satisfies NewRecipe;

    it("sletter ulagrede oppskrifter eldre enn grensen, med linjer og steg", () => {
      const db = createTestDb();
      const old = insertRecipe(db, created("2026-11-08T11:59:59.000Z"));
      expect(deleteStaleUnsavedRecipes(db, cutoff)).toBe(1);
      expect(findRecipeById(db, old)).toBeNull();
      expect(count(db, "ingredient_lines")).toBe(0);
      expect(count(db, "steps")).toBe(0);
    });

    it("beholder yngre ulagrede, grensen selv og lagrede uansett alder", () => {
      const db = createTestDb();
      const young = insertRecipe(db, created("2026-11-09T12:00:01.000Z"));
      const boundary = insertRecipe(db, created(cutoff));
      const saved = insertRecipe(db, created("2020-01-01T00:00:00.000Z", SAVED));
      expect(deleteStaleUnsavedRecipes(db, cutoff)).toBe(0);
      for (const id of [young, boundary, saved]) expect(findRecipeById(db, id)).not.toBeNull();
    });

    it("returnerer antall slettede", () => {
      const db = createTestDb();
      insertRecipe(db, created("2026-11-01T00:00:00.000Z"));
      insertRecipe(db, created("2026-11-02T00:00:00.000Z"));
      insertRecipe(db, created("2026-11-03T00:00:00.000Z", SAVED));
      expect(deleteStaleUnsavedRecipes(db, cutoff)).toBe(2);
      expect(count(db, "recipes")).toBe(1);
    });
  });
});

describe("favoritter (Story 3.4)", () => {
  const T0 = "2026-11-09T10:00:00.000Z";
  const saved = (title: string, savedAt: string, extra: Partial<NewRecipe> = {}): NewRecipe => ({
    ...base,
    title,
    savedAt,
    ...extra,
  });
  const row = (db: ReturnType<typeof createTestDb>, id: number) =>
    db.$client
      .prepare("select is_favorite, updated_at, saved_at, folder_id from recipes where id = ?")
      .get(id);

  it("nye oppskrifter er ikke favoritt, og findRecipeById og listSavedRecipes sier det", () => {
    const db = createTestDb();
    const id = insertRecipe(db, saved("A", T0));
    expect(findRecipeById(db, id)?.isFavorite).toBe(false);
    expect(listSavedRecipes(db, TEST_USER_ID)[0].isFavorite).toBe(false);
  });

  it("setRecipeFavorite markerer og avmarkerer, og returnerer true", () => {
    const db = createTestDb();
    const id = insertRecipe(db, saved("A", T0));
    expect(setRecipeFavorite(db, id, true)).toBe(true);
    expect(findRecipeById(db, id)?.isFavorite).toBe(true);
    expect(listSavedRecipes(db, TEST_USER_ID)[0].isFavorite).toBe(true);
    expect(setRecipeFavorite(db, id, false)).toBe(true);
    expect(findRecipeById(db, id)?.isFavorite).toBe(false);
  });

  it("er idempotent: samme verdi to ganger gir true begge ganger", () => {
    const db = createTestDb();
    const id = insertRecipe(db, saved("A", T0));
    expect(setRecipeFavorite(db, id, true)).toBe(true);
    expect(setRecipeFavorite(db, id, true)).toBe(true);
    expect(setRecipeFavorite(db, id, false)).toBe(true);
    expect(setRecipeFavorite(db, id, false)).toBe(true);
    expect(findRecipeById(db, id)?.isFavorite).toBe(false);
  });

  it("ukjent id og ikke-lagret oppskrift gir false og endrer ingenting", () => {
    const db = createTestDb();
    const unsaved = insertRecipe(db, base);
    expect(setRecipeFavorite(db, 999, true)).toBe(false);
    expect(setRecipeFavorite(db, unsaved, true)).toBe(false);
    expect(findRecipeById(db, unsaved)?.isFavorite).toBe(false);
    expect(count(db, "recipes")).toBe(1);
  });

  it("rører aldri updated_at, saved_at eller mappe", () => {
    const db = createTestDb();
    const folderId = insertFolder(db, {
      name: "Hverdag",
      nameKey: "hverdag",
      createdAt: T0,
      userId: TEST_USER_ID,
    });
    const id = insertRecipe(db, saved("A", T0, { updatedAt: "2026-11-09T09:00:00.000Z" }));
    assignRecipeToFolder(db, TEST_USER_ID, id, folderId);
    const before = row(db, id);
    setRecipeFavorite(db, id, true);
    setRecipeFavorite(db, id, false);
    setRecipeFavorite(db, id, true);
    expect(row(db, id)).toEqual({ ...(before as object), is_favorite: 1 });
  });

  it("listFavoriteRecipes gir bare lagrede favoritter, sist lagret først og deretter høyest id", () => {
    const db = createTestDb();
    const old = insertRecipe(db, saved("Eldst", "2026-11-09T09:00:00.000Z"));
    const same1 = insertRecipe(db, saved("Samme 1", "2026-11-09T11:00:00.000Z"));
    const same2 = insertRecipe(db, saved("Samme 2", "2026-11-09T11:00:00.000Z"));
    insertRecipe(db, saved("Ikke favoritt", "2026-11-09T12:00:00.000Z"));
    const unsaved = insertRecipe(db, base);
    for (const id of [old, same1, same2]) setRecipeFavorite(db, id, true);
    // En ulagret oppskrift kan ikke være favoritt, selv om kolonnen skulle være satt.
    setRecipeFavorite(db, unsaved, true);

    const favorites = listFavoriteRecipes(db, TEST_USER_ID);
    expect(favorites.map((r) => r.title)).toEqual(["Samme 2", "Samme 1", "Eldst"]);
    expect(favorites.every((r) => r.isFavorite)).toBe(true);
    expect(favorites[2]).toEqual({
      id: old,
      title: "Eldst",
      sourceName: null,
      sourceUrl: null,
      savedAt: "2026-11-09T09:00:00.000Z",
      isFavorite: true,
      folderName: null,
    });
  });

  it("listFavoriteRecipes er tom uten favoritter, og har mappenavnet", () => {
    const db = createTestDb();
    expect(listFavoriteRecipes(db, TEST_USER_ID)).toEqual([]);
    const folderId = insertFolder(db, {
      name: "Hverdag",
      nameKey: "hverdag",
      createdAt: T0,
      userId: TEST_USER_ID,
    });
    const id = insertRecipe(db, saved("A", T0));
    assignRecipeToFolder(db, TEST_USER_ID, id, folderId);
    setRecipeFavorite(db, id, true);
    expect(listFavoriteRecipes(db, TEST_USER_ID).map((r) => r.folderName)).toEqual(["Hverdag"]);
  });

  it("redigering (updateRecipe) og markRecipeSaved beholder favoritten", () => {
    const db = createTestDb();
    const id = insertRecipe(db, saved("A", T0));
    setRecipeFavorite(db, id, true);
    updateRecipe(db, id, {
      title: "Ny tittel",
      originalServings: 2,
      updatedAt: "2026-11-10T10:00:00.000Z",
      ingredients: [],
      steps: [],
    });
    markRecipeSaved(db, id, "2026-11-11T10:00:00.000Z", TEST_USER_ID);
    expect(findRecipeById(db, id)).toMatchObject({ isFavorite: true, title: "Ny tittel" });
  });

  it("mappehandlinger og sletting av mappen beholder favoritten", () => {
    const db = createTestDb();
    const folderId = insertFolder(db, {
      name: "Hverdag",
      nameKey: "hverdag",
      createdAt: T0,
      userId: TEST_USER_ID,
    });
    const id = insertRecipe(db, saved("A", T0));
    setRecipeFavorite(db, id, true);
    assignRecipeToFolder(db, TEST_USER_ID, id, folderId);
    expect(findRecipeById(db, id)?.isFavorite).toBe(true);
    db.$client.prepare("delete from folders where id = ?").run(folderId);
    expect(findRecipeById(db, id)).toMatchObject({ isFavorite: true, folderId: null });
    assignRecipeToFolder(db, TEST_USER_ID, id, null);
    expect(findRecipeById(db, id)?.isFavorite).toBe(true);
  });

  it("sletting av oppskriften fjerner den fra favorittene", () => {
    const db = createTestDb();
    const id = insertRecipe(db, saved("A", T0));
    setRecipeFavorite(db, id, true);
    deleteRecipeById(db, id);
    expect(listFavoriteRecipes(db, TEST_USER_ID)).toEqual([]);
  });
});

describe("findRecipeBySourceUrl og insertImportedRecipe (Story 2.2)", () => {
  const url = "https://www.matprat.no/oppskrifter/x/";
  const imported = { ...base, sourceUrl: url };

  it("finner ingenting for ukjent adresse, og sammenligner nøyaktig", () => {
    const db = createTestDb();
    insertRecipe(db, imported);
    expect(
      findRecipeBySourceUrl(db, "https://www.matprat.no/oppskrifter/y/", TEST_USER_ID),
    ).toBeNull();
    expect(findRecipeBySourceUrl(db, url.toUpperCase())).toBeNull();
    expect(findRecipeBySourceUrl(db, url.slice(0, -1))).toBeNull();
    expect(findRecipeBySourceUrl(db, url, TEST_USER_ID)).toEqual({ id: 1, saved: false });
  });

  it("en lagret oppskrift går foran en ulagret, uansett id", () => {
    const db = createTestDb();
    const saved = insertRecipe(db, { ...imported, savedAt: "2026-11-09T11:00:00.000Z" });
    insertRecipe(db, imported);
    expect(findRecipeBySourceUrl(db, url, TEST_USER_ID)).toEqual({ id: saved, saved: true });
    const db2 = createTestDb();
    insertRecipe(db2, imported);
    const later = insertRecipe(db2, { ...imported, savedAt: "2026-11-09T11:00:00.000Z" });
    expect(findRecipeBySourceUrl(db2, url, TEST_USER_ID)).toEqual({ id: later, saved: true });
  });

  it("insertImportedRecipe setter inn når adressen er ny", () => {
    const db = createTestDb();
    const result = insertImportedRecipe(db, imported);
    expect(result).toEqual({ kind: "inserted", id: 1 });
    expect(findRecipeById(db, 1)?.sourceUrl).toBe(url);
    expect(count(db, "ingredient_lines")).toBe(2);
  });

  it("gjenbruker en ulagret rad uten å skrive en ny", () => {
    const db = createTestDb();
    insertImportedRecipe(db, imported);
    expect(insertImportedRecipe(db, imported)).toEqual({ kind: "existing", id: 1 });
    expect(count(db, "recipes")).toBe(1);
    expect(count(db, "ingredient_lines")).toBe(2);
  });

  it("gir duplicate uten å skrive når en lagret oppskrift finnes", () => {
    const db = createTestDb();
    const id = insertRecipe(db, { ...imported, savedAt: "2026-11-09T11:00:00.000Z" });
    expect(insertImportedRecipe(db, imported)).toEqual({ kind: "duplicate", id });
    expect(count(db, "recipes")).toBe(1);
  });

  it("sjekk og skriv er én transaksjon: den andre av to importer får den første raden", () => {
    const db = createTestDb();
    const results = [insertImportedRecipe(db, imported), insertImportedRecipe(db, imported)];
    expect(results.map((r) => r.kind)).toEqual(["inserted", "existing"]);
    expect(count(db, "recipes")).toBe(1);
  });

  it("ruller tilbake alt når skrivingen feiler", () => {
    const db = createTestDb();
    const broken = {
      ...imported,
      steps: [{ position: 0, section: null, text: null as unknown as string }],
    };
    expect(() => insertImportedRecipe(db, broken)).toThrow();
    expect(count(db, "recipes")).toBe(0);
    expect(count(db, "ingredient_lines")).toBe(0);
  });
});

describe("eierskap (Story 5.13)", () => {
  const SAVED = "2026-11-10T08:00:00.000Z";
  function secondUser(db: ReturnType<typeof createTestDb>): number {
    return Number(
      db.$client
        .prepare("insert into users (email, password_hash, created_at) values ('b@b.no', 'x', 'x')")
        .run().lastInsertRowid,
    );
  }

  it("lister bare brukerens egne lagrede oppskrifter, ingredienser og favoritter", () => {
    const db = createTestDb();
    const other = secondUser(db);
    const mine = insertRecipe(db, { ...base, title: "Min", savedAt: SAVED });
    const theirs = insertRecipe(db, { ...base, title: "Deres", savedAt: SAVED, userId: other });
    setRecipeFavorite(db, mine, true);
    setRecipeFavorite(db, theirs, true);
    expect(listSavedRecipes(db, TEST_USER_ID).map((r) => r.title)).toEqual(["Min"]);
    expect(listSavedRecipes(db, other).map((r) => r.title)).toEqual(["Deres"]);
    expect([...listSavedIngredientNames(db, TEST_USER_ID).keys()]).toEqual([mine]);
    expect(listFavoriteRecipes(db, other).map((r) => r.title)).toEqual(["Deres"]);
  });

  it("markRecipeSaved gir eier til en import uten eier, men tar ikke en annens", () => {
    const db = createTestDb();
    const other = secondUser(db);
    const anonymous = insertRecipe(db, { ...base, userId: null });
    expect(markRecipeSaved(db, anonymous, SAVED, TEST_USER_ID)).toBe(true);
    expect(findRecipeOwner(db, anonymous)).toEqual({ userId: TEST_USER_ID });
    const theirs = insertRecipe(db, { ...base, userId: other });
    expect(markRecipeSaved(db, theirs, SAVED, TEST_USER_ID)).toBe(false);
    expect(findRecipeById(db, theirs)?.savedAt).toBeNull();
    expect(findRecipeOwner(db, 999)).toBeNull();
  });

  it("findRecipeBySourceUrl ser bare på samme eier", () => {
    const db = createTestDb();
    const url = "https://eksempel.no/a";
    const id = insertRecipe(db, { ...base, sourceUrl: url, userId: null });
    expect(findRecipeBySourceUrl(db, url, null)).toEqual({ id, saved: false });
    expect(findRecipeBySourceUrl(db, url, TEST_USER_ID)).toBeNull();
  });
});
