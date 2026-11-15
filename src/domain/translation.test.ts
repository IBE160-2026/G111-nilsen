import { describe, expect, it } from "vitest";
import { applyTranslation, looksEnglish, translationFits } from "./translation";
import { parseLine } from "./parse-line";
import type { Recipe, RecipeTranslation } from "./types";

const recipe = {
  id: 1,
  title: "Cinnamon rolls",
  ingredients: [
    { ...parseLine("2 cups flour"), id: 7, position: 1, section: "Dough" },
    { ...parseLine("1 cup sugar"), id: 5, position: 0, section: null },
  ],
  steps: [
    { id: 2, position: 0, section: "Dough", text: "Mix the flour and sugar." },
    { id: 3, position: 1, section: null, text: "Bake for 20 minutes." },
  ],
} as unknown as Recipe;

const translation: RecipeTranslation = {
  title: "Kanelboller",
  ingredients: ["2,4 dl sukker", "4,7 dl mel"],
  steps: ["Bland mel og sukker.", "Stek i 20 minutter."],
  sections: { Dough: "Deig" },
  active: true,
};

describe("applyTranslation", () => {
  it("bytter tittel, ingredienser og steg, og beholder id, posisjon og delnavn oversatt", () => {
    const result = applyTranslation(recipe, translation);
    expect(result.title).toBe("Kanelboller");
    expect(result.ingredients.map((l) => [l.id, l.position, l.section, l.original])).toEqual([
      [5, 0, null, "2,4 dl sukker"],
      [7, 1, "Deig", "4,7 dl mel"],
    ]);
    expect(result.ingredients[0].unit).toBe("dl");
    expect(result.steps.map((s) => [s.id, s.section, s.text])).toEqual([
      [2, "Deig", "Bland mel og sukker."],
      [3, null, "Stek i 20 minutter."],
    ]);
  });

  it("returnerer originalen når antallet ikke passer lenger", () => {
    const changed = { ...translation, steps: ["Bare ett steg."] };
    expect(applyTranslation(recipe, changed)).toBe(recipe);
    expect(translationFits(recipe, changed)).toBe(false);
    expect(translationFits(recipe, translation)).toBe(true);
  });
});

describe("looksEnglish", () => {
  it("kjenner igjen en engelsk oppskrift", () => {
    expect(looksEnglish(recipe)).toBe(true);
  });

  it("norsk oppskrift er ikke engelsk", () => {
    const norsk = {
      title: "Kanelboller",
      ingredients: [{ ...parseLine("5 dl melk"), id: 1, position: 0, section: null }],
      steps: [
        {
          id: 1,
          position: 0,
          section: null,
          text: "Bland mel og sukker med melk og stek i ovnen.",
        },
      ],
    };
    expect(looksEnglish(norsk)).toBe(false);
  });

  it("for lite tekst gir nei", () => {
    expect(looksEnglish({ title: "Pasta", ingredients: [], steps: [] })).toBe(false);
  });
});
