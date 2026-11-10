import { describe, expect, it } from "vitest";
import { matchRecipes } from "./RecipePicker";

const recipes = [
  { id: 1, title: "Amerikanske pannekaker" },
  { id: 2, title: "Grove pannekaker - Perfekt middag" },
  { id: 3, title: "Jegergryte - Enkel viltgryte" },
  { id: 4, title: "Fårikål" },
];

const titles = (query: string) => matchRecipes(recipes, query).map((recipe) => recipe.id);

describe("matchRecipes", () => {
  it("gir alle for tomt søk, i samme rekkefølge", () => {
    expect(titles("")).toEqual([1, 2, 3, 4]);
    expect(titles("   ")).toEqual([1, 2, 3, 4]);
  });

  it("finner deler av ord uansett store og små bokstaver", () => {
    expect(titles("PANNE")).toEqual([1, 2]);
    expect(titles("gryte")).toEqual([3]);
  });

  it("krever at alle ordene finnes, i hvilken som helst rekkefølge", () => {
    expect(titles("middag grove")).toEqual([2]);
    expect(titles("pannekaker vilt")).toEqual([]);
  });

  it("skiller æ, ø og å fra a og o", () => {
    expect(titles("fårikål")).toEqual([4]);
    expect(titles("farikal")).toEqual([]);
  });
});
