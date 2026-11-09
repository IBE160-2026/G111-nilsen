import { describe, expect, it } from "vitest";
import { createTestDb } from "../client";
import {
  deleteRecipeById,
  deleteStaleUnsavedRecipes,
  findRecipeById,
  insertRecipe,
  listSavedRecipes,
  markRecipeSaved,
  updateRecipe,
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
    expect(listSavedRecipes(createTestDb())).toEqual([]);
  });

  it("utelater oppskrifter uten savedAt", () => {
    const db = createTestDb();
    insertRecipe(db, at(null, "Ikke i samlingen", { sourceUrl: "https://a.no/x" }));
    const saved = insertRecipe(db, at("2026-11-09T10:00:00.000Z", "I samlingen"));
    expect(listSavedRecipes(db).map((r) => r.id)).toEqual([saved]);
  });

  it("sorterer på savedAt synkende, og på id synkende ved likt tidspunkt", () => {
    const db = createTestDb();
    const oldest = insertRecipe(db, at("2026-11-09T09:00:00.000Z", "Eldst"));
    const tieA = insertRecipe(db, at("2026-11-09T11:00:00.000Z", "Lik A"));
    const newest = insertRecipe(db, at("2026-11-09T12:00:00.000Z", "Nyest"));
    const tieB = insertRecipe(db, at("2026-11-09T11:00:00.000Z", "Lik B"));
    expect(listSavedRecipes(db).map((r) => r.id)).toEqual([newest, tieB, tieA, oldest]);
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
    expect(listSavedRecipes(db)).toEqual([
      {
        id,
        title: "Pannekaker",
        sourceName: "Matprat",
        sourceUrl: "https://www.matprat.no/x",
        savedAt: "2026-11-09T10:00:00.000Z",
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
      expect(markRecipeSaved(db, id, SAVED)).toBe(true);
      expect(findRecipeById(db, id)).toMatchObject({
        savedAt: SAVED,
        updatedAt: base.updatedAt,
        createdAt: base.createdAt,
      });
    });

    it("beholder savedAt når oppskriften allerede er lagret", () => {
      const db = createTestDb();
      const id = insertRecipe(db, { ...base, savedAt: "2026-11-09T11:00:00.000Z" });
      expect(markRecipeSaved(db, id, SAVED)).toBe(true);
      expect(findRecipeById(db, id)?.savedAt).toBe("2026-11-09T11:00:00.000Z");
    });

    it("returnerer false for ukjent id", () => {
      expect(markRecipeSaved(createTestDb(), 999, SAVED)).toBe(false);
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
