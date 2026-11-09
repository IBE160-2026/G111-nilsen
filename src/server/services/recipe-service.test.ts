import { describe, expect, it } from "vitest";
import { createTestDb } from "../db/client";
import { createManualRecipe, getRecipe, type ManualRecipeInput } from "./recipe-service";

const input: ManualRecipeInput = {
  title: "Pannekaker",
  servings: 4,
  ingredients: ["3 dl hvetemel", "6 dl melk", "3 egg"],
  steps: ["Visp sammen.", "Stek tynne pannekaker."],
};

function count(db: ReturnType<typeof createTestDb>, table: string): number {
  return (db.$client.prepare(`select count(*) as n from ${table}`).get() as { n: number }).n;
}

function saveAndRead(values: Partial<ManualRecipeInput>) {
  const db = createTestDb();
  const created = createManualRecipe({ ...input, ...values }, db);
  if (!created.ok) throw new Error(`forventet ok, fikk ${created.error.kind}`);
  const read = getRecipe(created.value.id, db);
  if (!read.ok) throw new Error("fant ikke oppskriften");
  return read.value;
}

describe("recipe-service", () => {
  it("Gyldig: lagrer tittel, antall, tolkede linjer og steg", () => {
    const recipe = saveAndRead({});
    expect(recipe).toMatchObject({
      title: "Pannekaker",
      originalServings: 4,
      sourceName: null,
      sourceUrl: null,
    });
    expect(recipe.ingredients.map((l) => [l.original, l.quantity, l.unit, l.name])).toEqual([
      ["3 dl hvetemel", { min: 3 }, "dl", "hvetemel"],
      ["6 dl melk", { min: 6 }, "dl", "melk"],
      ["3 egg", { min: 3 }, null, "egg"],
    ]);
    expect(recipe.ingredients.map((l) => l.position)).toEqual([0, 1, 2]);
    expect(recipe.steps.map((s) => s.text)).toEqual(["Visp sammen.", "Stek tynne pannekaker."]);
  });

  it("lagres med savedAt = null (ikke i samlingen) og ISO-tidspunkt i UTC", () => {
    const recipe = saveAndRead({});
    expect(recipe.savedAt).toBeNull();
    expect(recipe.createdAt).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
    expect(recipe.updatedAt).toBe(recipe.createdAt);
  });

  it("Tomme linjer: trimmes og fjernes, rekkefølgen beholdes", () => {
    const recipe = saveAndRead({
      title: "  Pannekaker ",
      ingredients: ["  2 egg ", "", "   ", "1 dl melk"],
      steps: [" ", " Rør "],
    });
    expect(recipe.title).toBe("Pannekaker");
    expect(recipe.ingredients.map((l) => l.original)).toEqual(["2 egg", "1 dl melk"]);
    expect(recipe.steps.map((s) => s.text)).toEqual(["Rør"]);
  });

  it("Utolkbar linje: lagres med parseable = false og originaltekst", () => {
    const [line] = saveAndRead({ ingredients: ["salt og pepper"] }).ingredients;
    expect(line).toMatchObject({
      original: "salt og pepper",
      parseable: false,
      quantity: null,
      unit: null,
    });
  });

  it("Mengde uten navn: «2 ss» lagres med tomt navn og parseable = true", () => {
    const [line] = saveAndRead({ ingredients: ["2 ss"] }).ingredients;
    expect(line).toMatchObject({ name: "", parseable: true, quantity: { min: 2 }, unit: "ss" });
  });

  it("Uten steg: lagres", () => {
    expect(saveAndRead({ steps: [] }).steps).toEqual([]);
  });

  it("avviser input uten tittel eller ingredienser, og lagrer ingenting", () => {
    const db = createTestDb();
    expect(createManualRecipe({ ...input, title: "  " }, db)).toEqual({
      ok: false,
      error: { kind: "validation", detail: "title" },
    });
    expect(createManualRecipe({ ...input, ingredients: [" "] }, db)).toEqual({
      ok: false,
      error: { kind: "validation", detail: "ingredients" },
    });
    expect(createManualRecipe({ ...input, servings: 0 }, db).ok).toBe(false);
    expect(count(db, "recipes")).toBe(0);
  });

  it.each([999999, 0, -1, 1.5, Number.NaN])("Ukjent oppskrift: id %s gir not_found", (id) => {
    expect(getRecipe(id, createTestDb())).toEqual({ ok: false, error: { kind: "not_found" } });
  });
});
