import { describe, expect, it } from "vitest";
import { manualRecipeFieldMessages as m } from "@/lib/messages";
import { splitLines, validateManualRecipe } from "./manual-recipe-schema";
import type { ManualRecipeValues } from "./form-fields";

const valid: ManualRecipeValues = {
  title: "Pannekaker",
  servings: "4",
  minutes: "",
  ingredients: "3 dl hvetemel\n6 dl melk\n3 egg",
  steps: "Visp sammen.\nStek tynne pannekaker.",
};

function check(values: Partial<ManualRecipeValues>) {
  return validateManualRecipe({ ...valid, ...values });
}

function errorsOf(values: Partial<ManualRecipeValues>) {
  const result = check(values);
  if (result.ok) throw new Error("forventet valideringsfeil");
  return result.fieldErrors;
}

describe("splitLines", () => {
  it("trimmer, fjerner tomme linjer og beholder rekkefølgen", () => {
    expect(splitLines("  b \r\n\n   \r\na\n")).toEqual(["b", "a"]);
  });
});

describe("validateManualRecipe (matrisen i spec 1.4)", () => {
  it("Gyldig: godtar og gir tolkede verdier", () => {
    expect(check({})).toEqual({
      ok: true,
      data: {
        title: "Pannekaker",
        servings: 4,
        minutes: null,
        ingredients: ["3 dl hvetemel", "6 dl melk", "3 egg"],
        steps: ["Visp sammen.", "Stek tynne pannekaker."],
      },
    });
  });

  it("Tomme linjer: ignoreres, linjer trimmes, rekkefølgen beholdes", () => {
    const result = check({ ingredients: "\n  2 egg  \n\n   \n1 dl melk\n", steps: " \n Rør \n\n" });
    expect(result.ok && result.data.ingredients).toEqual(["2 egg", "1 dl melk"]);
    expect(result.ok && result.data.steps).toEqual(["Rør"]);
  });

  it("Uten steg: godtas", () => {
    const result = check({ steps: "" });
    expect(result.ok && result.data.steps).toEqual([]);
  });

  it("Antall med mellomrom: «4 » godtas som 4", () => {
    const result = check({ servings: "4 " });
    expect(result.ok && result.data.servings).toBe(4);
  });

  it.each(["1", "50"])("antall %s godtas", (servings) => {
    expect(check({ servings }).ok).toBe(true);
  });

  it.each(["", "   "])("Mangler tittel: %j gir melding under Tittel", (title) => {
    expect(errorsOf({ title })).toEqual({ title: m.titleRequired });
  });

  it.each(["0", "51", "2,5", "2.5", "abc", "", "-1", "1e1"])(
    "Ugyldig antall: %j gir melding under Antall personer",
    (servings) => {
      expect(errorsOf({ servings })).toEqual({ servings: m.servingsInvalid });
    },
  );

  it.each(["", "\n   \n\n"])("Ingen ingredienser: %j gir melding under Ingredienser", (text) => {
    expect(errorsOf({ ingredients: text })).toEqual({ ingredients: m.ingredientsRequired });
  });

  it("For lang tittel (over 200 tegn)", () => {
    expect(check({ title: "a".repeat(200) }).ok).toBe(true);
    expect(errorsOf({ title: "a".repeat(201) })).toEqual({ title: m.titleTooLong });
  });

  it("Flere enn 100 ikke-tomme linjer i Ingredienser", () => {
    const lines = (n: number) => Array.from({ length: n }, (_, i) => `${i + 1} g mel`).join("\n\n");
    expect(check({ ingredients: lines(100) }).ok).toBe(true);
    expect(errorsOf({ ingredients: lines(101) })).toEqual({ ingredients: m.ingredientsTooMany });
  });

  it("Flere enn 100 ikke-tomme linjer i Steg", () => {
    const lines = Array.from({ length: 101 }, (_, i) => `Steg ${i}`).join("\n");
    expect(errorsOf({ steps: lines })).toEqual({ steps: m.stepsTooMany });
  });

  it("En ingredienslinje over 300 tegn", () => {
    expect(check({ ingredients: `1 ${"a".repeat(298)}` }).ok).toBe(true);
    expect(errorsOf({ ingredients: `2 egg\n${"a".repeat(301)}` })).toEqual({
      ingredients: m.ingredientLineTooLong,
    });
  });

  it("Et steg over 2000 tegn", () => {
    expect(errorsOf({ steps: "a".repeat(2001) })).toEqual({ steps: m.stepTooLong });
  });

  it("gir én melding per felt når flere felt er feil", () => {
    expect(errorsOf({ title: "", servings: "0", ingredients: "" })).toEqual({
      title: m.titleRequired,
      servings: m.servingsInvalid,
      ingredients: m.ingredientsRequired,
    });
  });
});

describe("tid i minutter (Story 6.2)", () => {
  it.each([
    ["", null],
    ["  ", null],
    ["45", 45],
    [" 90 ", 90],
    ["1440", 1440],
  ])("%j gir %j", (minutes, expected) => {
    const result = check({ minutes });
    expect(result.ok && result.data.minutes).toBe(expected);
  });

  it.each(["0", "1441", "4,5", "-3", "en time", "12345"])("%j gir feil under feltet", (minutes) => {
    expect(check({ minutes })).toEqual({
      ok: false,
      fieldErrors: { minutes: m.minutesInvalid },
    });
  });
});
