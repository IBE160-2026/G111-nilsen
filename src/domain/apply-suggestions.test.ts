import { describe, expect, it } from "vitest";
import { withAppliedSuggestions } from "./apply-suggestions";
import { parseLine } from "./parse-line";
import type { AppliedSuggestion, RecipeLine, Step } from "./types";

const ingredients: RecipeLine[] = ["3 dl melk", "2 dl hvetemel", "3 egg"].map((text, i) => ({
  ...parseLine(text),
  id: i + 1,
  position: i + 1,
  section: null,
}));
const steps: Step[] = [
  { id: 1, position: 1, section: null, text: "Visp sammen mel og melk." },
  { id: 2, position: 2, section: null, text: "Stek tynne pannekaker." },
  { id: 3, position: 3, section: null, text: "Server varme." },
];
const applied = (id: number, text: string, appliesTo: AppliedSuggestion["appliesTo"]) => ({
  id,
  text,
  reason: "Fordi.",
  appliesTo,
});

describe("withAppliedSuggestions", () => {
  it("uten forslag gir det samme linjer og steg, og ingen tips", () => {
    const shown = withAppliedSuggestions(ingredients, steps, []);
    expect(shown.ingredients).toEqual(ingredients);
    expect(shown.steps).toEqual(steps);
    expect(shown.tips).toEqual([]);
  });

  it("et enkelt ingrediensforslag blir en tolket linje sist, merket og med negativ id", () => {
    const shown = withAppliedSuggestions(ingredients, steps, [
      applied(4, "Ha en teskje vaniljesukker eller kardemomme i røren.", "ingredients"),
    ]);
    const last = shown.ingredients.at(-1)!;
    expect(last).toMatchObject({
      id: -4,
      position: 4,
      suggested: true,
      parseable: true,
      quantity: { min: 1 },
      unit: "ts",
    });
    expect(last.original).toBe("1 ts vaniljesukker eller kardemomme");
    expect(shown.ingredients).toHaveLength(4);
  });

  it("et annet ingrediensforslag (språkmodell) står som tekst", () => {
    const shown = withAppliedSuggestions(ingredients, steps, [
      applied(9, "Bytt halvparten av melken med kefir.", "ingredients"),
    ]);
    expect(shown.ingredients.at(-1)).toMatchObject({
      original: "Bytt halvparten av melken med kefir.",
      suggested: true,
    });
  });

  it("et stegforslag settes foran steget det hører til, og stegene nummereres på nytt", () => {
    const shown = withAppliedSuggestions(ingredients, steps, [
      applied(5, "La røren hvile i 20–30 minutter før du begynner å steke.", "steps"),
    ]);
    expect(shown.steps.map((s) => [s.position, s.text, s.suggested ?? false])).toEqual([
      [1, "Visp sammen mel og melk.", false],
      [2, "La røren hvile i 20–30 minutter før du begynner å steke.", true],
      [3, "Stek tynne pannekaker.", false],
      [4, "Server varme.", false],
    ]);
    expect(shown.steps[1].id).toBe(-5);
  });

  it("«*» setter steget først, og ukjente stegforslag legges sist", () => {
    const shown = withAppliedSuggestions(ingredients, steps, [
      applied(
        6,
        "Forvarm ovnen helt før kaken settes inn, og unngå å åpne døren de første 20 minuttene.",
        "steps",
      ),
      applied(7, "Smak til med salt.", "steps"),
    ]);
    expect(shown.steps[0].text).toContain("Forvarm ovnen");
    expect(shown.steps.at(-1)!.text).toBe("Smak til med salt.");
  });

  it("finner ingen steg som passer, legges forslaget sist", () => {
    const shown = withAppliedSuggestions(
      ingredients,
      [steps[0]],
      [applied(5, "La røren hvile i 20–30 minutter før du begynner å steke.", "steps")],
    );
    expect(shown.steps.map((s) => s.text)).toEqual([
      "Visp sammen mel og melk.",
      "La røren hvile i 20–30 minutter før du begynner å steke.",
    ]);
  });

  it("forslag om hele retten blir tips", () => {
    const shown = withAppliedSuggestions(ingredients, steps, [
      applied(8, "Server med friske bær og rømme.", "recipe"),
    ]);
    expect(shown.tips).toEqual(["Server med friske bær og rømme."]);
    expect(shown.steps).toHaveLength(3);
  });

  it("endrer ikke inndata", () => {
    const copy = structuredClone({ ingredients, steps });
    withAppliedSuggestions(ingredients, steps, [
      applied(4, "Ha en teskje vaniljesukker eller kardemomme i røren.", "ingredients"),
      applied(5, "La røren hvile i 20–30 minutter før du begynner å steke.", "steps"),
    ]);
    expect({ ingredients, steps }).toEqual(copy);
  });
});
