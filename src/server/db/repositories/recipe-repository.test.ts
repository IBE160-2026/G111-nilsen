import { describe, expect, it } from "vitest";
import { createTestDb } from "../client";
import {
  findRecipeById,
  insertRecipe,
  updateRecipe,
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
