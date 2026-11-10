import { describe, expect, it } from "vitest";
import type { Recipe } from "@/domain";
import { initialValuesOf } from "./initial-values";

const recipe: Recipe = {
  id: 1,
  title: "Importert",
  sourceUrl: "https://a.no/x",
  sourceName: "A",
  originalServings: null,
  selectedServings: null,
  savedAt: null,
  folderId: null,
  isFavorite: false,
  createdAt: "2026-11-09T10:00:00.000Z",
  updatedAt: "2026-11-09T10:00:00.000Z",
  ingredients: [
    {
      id: 2,
      position: 1,
      section: null,
      original: "salt",
      quantity: null,
      unit: null,
      name: "salt",
      parseable: false,
    },
    {
      id: 1,
      position: 0,
      section: null,
      original: "2 egg",
      quantity: { min: 2 },
      unit: null,
      name: "egg",
      parseable: true,
    },
  ],
  steps: [{ id: 1, position: 0, section: null, text: "Stek." }],
  suggestions: [],
};

describe("initialValuesOf", () => {
  it("importert oppskrift uten porsjonsantall (null) gir tomt felt, ikke «null» eller «NaN»", () => {
    expect(initialValuesOf(recipe)).toEqual({
      title: "Importert",
      servings: "",
      minutes: "",
      ingredients: "2 egg\nsalt",
      steps: "Stek.",
    });
  });

  it("porsjonsantall vises som tekst", () => {
    expect(initialValuesOf({ ...recipe, originalServings: 4 }).servings).toBe("4");
  });

  it("tid vises som tekst, og manglende tid som tomt felt (Story 6.2)", () => {
    expect(initialValuesOf({ ...recipe, totalMinutes: 45 }).minutes).toBe("45");
    expect(initialValuesOf({ ...recipe, totalMinutes: null }).minutes).toBe("");
  });
});
