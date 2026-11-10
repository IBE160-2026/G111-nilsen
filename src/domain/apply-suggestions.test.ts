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

  it("et stegforslag flettes inn foran teksten i steget det hører til", () => {
    const shown = withAppliedSuggestions(ingredients, steps, [
      applied(5, "La røren hvile i 20–30 minutter før du begynner å steke.", "steps"),
    ]);
    expect(shown.steps).toHaveLength(3);
    expect(shown.steps[1]).toMatchObject({
      id: 2,
      text: "Stek tynne pannekaker.",
      addedBefore: ["La røren hvile i 20–30 minutter før du begynner å steke."],
    });
    expect(shown.steps[0].addedBefore).toBeUndefined();
  });

  it("«*» fletter inn i første steg, og ukjente stegforslag etter teksten i siste steg", () => {
    const shown = withAppliedSuggestions(ingredients, steps, [
      applied(
        6,
        "Forvarm ovnen helt før kaken settes inn, og unngå å åpne døren de første 20 minuttene.",
        "steps",
      ),
      applied(7, "Smak til med salt", "steps"),
    ]);
    expect(shown.steps[0].addedBefore?.[0]).toContain("Forvarm ovnen");
    expect(shown.steps[2].addedAfter).toEqual(["Smak til med salt."]);
  });

  it("finner ingen steg som passer, flettes forslaget inn etter siste steg", () => {
    const shown = withAppliedSuggestions(
      ingredients,
      [steps[0]],
      [applied(5, "La røren hvile i 20–30 minutter før du begynner å steke.", "steps")],
    );
    expect(shown.steps).toHaveLength(1);
    expect(shown.steps[0].addedAfter).toEqual([
      "La røren hvile i 20–30 minutter før du begynner å steke.",
    ]);
  });

  it("uten steg blir stegforslaget et eget merket steg", () => {
    const shown = withAppliedSuggestions(ingredients, [], [applied(5, "Smak til.", "steps")]);
    expect(shown.steps).toEqual([
      { id: -5, position: 1, section: null, text: "Smak til.", suggested: true },
    ]);
  });

  it("et ingrediensforslag nevnes også i steget der det hører hjemme", () => {
    const shown = withAppliedSuggestions(ingredients, steps, [
      applied(4, "Ha en teskje vaniljesukker eller kardemomme i røren.", "ingredients"),
    ]);
    expect(shown.steps[0].addedAfter).toEqual(["Rør inn vaniljesukker eller kardemomme."]);
    expect(shown.steps[1].addedAfter).toBeUndefined();
  });

  it("et ingrediensforslag uten passende steg, eller fra språkmodell, står bare i listen", () => {
    const shown = withAppliedSuggestions(
      ingredients,
      [steps[2]],
      [
        applied(4, "Ha en teskje vaniljesukker eller kardemomme i røren.", "ingredients"),
        applied(9, "Bytt litt melk med kefir.", "ingredients"),
      ],
    );
    expect(shown.steps[0].addedAfter).toBeUndefined();
    expect(shown.ingredients).toHaveLength(5);
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
