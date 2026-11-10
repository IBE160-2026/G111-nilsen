import { describe, expect, it } from "vitest";
import { createTestDb } from "../client";
import {
  deleteRecipeById,
  findRecipeById,
  insertRecipe,
  type NewRecipe,
} from "./recipe-repository";
import { deleteAppliedSuggestion, insertAppliedSuggestion } from "./suggestion-repository";

const recipe: NewRecipe = {
  title: "Pannekaker",
  sourceUrl: null,
  sourceName: null,
  originalServings: 4,
  selectedServings: null,
  savedAt: null,
  createdAt: "2026-11-10T08:00:00.000Z",
  updatedAt: "2026-11-10T08:00:00.000Z",
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
};

const suggestion = {
  text: "Tilsett sitron.",
  reason: "Gir friskhet.",
  appliesTo: "recipe" as const,
};
const NOW = "2026-11-10T09:00:00.000Z";

function setup() {
  const db = createTestDb();
  return {
    db,
    id: insertRecipe(db, recipe),
    other: insertRecipe(db, { ...recipe, title: "Vafler" }),
  };
}

describe("insertAppliedSuggestion", () => {
  it("lagrer forslaget og gir det tilbake med id", () => {
    const { db, id } = setup();
    const stored = insertAppliedSuggestion(db, id, suggestion, NOW);
    expect(stored).toEqual({ id: expect.any(Number), ...suggestion });
    expect(findRecipeById(db, id)?.suggestions).toEqual([stored]);
  });

  it("rører ikke oppskriften: updatedAt, valgt antall, ingredienser og steg er uendret", () => {
    const { db, id } = setup();
    const before = findRecipeById(db, id)!;
    insertAppliedSuggestion(db, id, suggestion, NOW);
    const after = findRecipeById(db, id)!;
    expect({ ...after, suggestions: [] }).toEqual({ ...before, suggestions: [] });
    expect(after.updatedAt).toBe(recipe.updatedAt);
  });

  it("samme tekst to ganger gir den eksisterende raden, ikke en dublett", () => {
    const { db, id } = setup();
    const first = insertAppliedSuggestion(db, id, suggestion, NOW);
    const again = insertAppliedSuggestion(
      db,
      id,
      { ...suggestion, reason: "Annen begrunnelse." },
      NOW,
    );
    expect(again).toEqual(first);
    expect(findRecipeById(db, id)?.suggestions).toHaveLength(1);
    expect(findRecipeById(db, id)?.suggestions[0].reason).toBe("Gir friskhet.");
  });

  it("samme tekst kan tas i bruk på to ulike oppskrifter", () => {
    const { db, id, other } = setup();
    insertAppliedSuggestion(db, id, suggestion, NOW);
    insertAppliedSuggestion(db, other, suggestion, NOW);
    expect(findRecipeById(db, id)?.suggestions).toHaveLength(1);
    expect(findRecipeById(db, other)?.suggestions).toHaveLength(1);
  });

  it("gir null for en oppskrift som ikke finnes, og lagrer ingenting", () => {
    const { db } = setup();
    expect(insertAppliedSuggestion(db, 9999, suggestion, NOW)).toBeNull();
    const rows = db.$client.prepare("select count(*) as n from suggestions").get() as { n: number };
    expect(rows.n).toBe(0);
  });

  it("listen står eldste først", () => {
    const { db, id } = setup();
    insertAppliedSuggestion(db, id, { ...suggestion, text: "B" }, NOW);
    insertAppliedSuggestion(db, id, { ...suggestion, text: "A" }, NOW);
    expect(findRecipeById(db, id)?.suggestions.map((s) => s.text)).toEqual(["B", "A"]);
  });
});

describe("deleteAppliedSuggestion", () => {
  it("sletter forslaget og bare det", () => {
    const { db, id } = setup();
    const a = insertAppliedSuggestion(db, id, { ...suggestion, text: "A" }, NOW)!;
    insertAppliedSuggestion(db, id, { ...suggestion, text: "B" }, NOW);
    expect(deleteAppliedSuggestion(db, id, a.id)).toBe(true);
    expect(findRecipeById(db, id)?.suggestions.map((s) => s.text)).toEqual(["B"]);
  });

  it("gir false for ukjent id, og sletter ikke et forslag fra en annen oppskrift", () => {
    const { db, id, other } = setup();
    const stored = insertAppliedSuggestion(db, id, suggestion, NOW)!;
    expect(deleteAppliedSuggestion(db, id, 9999)).toBe(false);
    expect(deleteAppliedSuggestion(db, other, stored.id)).toBe(false);
    expect(findRecipeById(db, id)?.suggestions).toHaveLength(1);
  });
});

describe("forslag og oppskriften", () => {
  it("slettes sammen med oppskriften (cascade)", () => {
    const { db, id } = setup();
    insertAppliedSuggestion(db, id, suggestion, NOW);
    expect(deleteRecipeById(db, id)).toBe(true);
    const rows = db.$client.prepare("select count(*) as n from suggestions").get() as { n: number };
    expect(rows.n).toBe(0);
  });

  it("en oppskrift uten valgte forslag har en tom liste", () => {
    const { db, id } = setup();
    expect(findRecipeById(db, id)?.suggestions).toEqual([]);
  });
});
