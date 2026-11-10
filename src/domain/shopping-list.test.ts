import { describe, expect, it } from "vitest";
import { parseLine } from "./parse-line";
import { buildShoppingList, splitByPantry, type ShoppingRecipe } from "./shopping-list";

function recipe(
  id: number,
  title: string,
  lines: string[],
  original: number | null = 4,
): ShoppingRecipe {
  return {
    id,
    title,
    originalServings: original,
    selectedServings: null,
    ingredients: lines.map((text, i) => ({
      ...parseLine(text),
      id: id * 100 + i,
      position: i + 1,
      section: null,
    })),
  };
}
const texts = (items: { text: string }[]) => items.map((i) => i.text);

describe("buildShoppingList", () => {
  it("slår sammen samme ingrediens og enhet, og sorterer på navn", () => {
    const list = buildShoppingList([
      { recipe: recipe(1, "Pannekaker", ["4 dl melk", "3 egg", "400 g mel"]), servings: 4 },
      { recipe: recipe(2, "Vafler", ["2 dl melk", "2 egg"]), servings: 4 },
    ]);
    expect(texts(list)).toEqual(["5 egg", "400 g mel", "6 dl melk"]);
    expect(list.find((i) => i.text === "6 dl melk")?.recipes).toEqual(["Pannekaker", "Vafler"]);
  });

  it("ulike enheter for samme ingrediens står hver for seg", () => {
    const list = buildShoppingList([
      { recipe: recipe(1, "A", ["2 dl melk"]), servings: 4 },
      { recipe: recipe(2, "B", ["1 ss melk"]), servings: 4 },
    ]);
    expect(texts(list)).toEqual(["2 dl melk", "1 ss melk"]);
  });

  it("skalerer hver oppskrift til valgt antall før den slås sammen", () => {
    const list = buildShoppingList([
      { recipe: recipe(1, "A", ["4 dl melk"]), servings: 8 },
      { recipe: recipe(2, "B", ["4 dl melk"]), servings: 2 },
    ]);
    expect(texts(list)).toEqual(["10 dl melk"]);
  });

  it("støtter halve porsjoner og oppskrift uten antall (uskalert)", () => {
    expect(
      texts(buildShoppingList([{ recipe: recipe(1, "A", ["4 dl melk"]), servings: 4.5 }])),
    ).toEqual(["4 ½ dl melk"]);
    expect(
      texts(buildShoppingList([{ recipe: recipe(1, "A", ["4 dl melk"], null), servings: 8 }])),
    ).toEqual(["4 dl melk"]);
  });

  it("regner om til metrisk før sammenslåing, så kopper og dl legges sammen", () => {
    const list = buildShoppingList(
      [
        { recipe: recipe(1, "A", ["1 cup milk"]), servings: 4 },
        { recipe: recipe(2, "B", ["1 dl milk"]), servings: 4 },
      ],
      "metric",
    );
    expect(texts(list)).toEqual(["3,4 dl milk (ca.)"]);
  });

  it("linjer uten mengde eller som ikke kan tolkes står som de er, én gang per tekst", () => {
    const list = buildShoppingList([
      { recipe: recipe(1, "A", ["salt og pepper", "Saft av en sitron"]), servings: 4 },
      { recipe: recipe(2, "B", ["Salt og pepper"]), servings: 4 },
    ]);
    expect(list.map((i) => i.text).sort()).toEqual(["Saft av en sitron", "salt og pepper"]);
    expect(list.find((i) => i.text === "salt og pepper")?.recipes).toEqual(["A", "B"]);
  });

  it("tom utvalg gir tom liste, og originalene røres ikke", () => {
    expect(buildShoppingList([])).toEqual([]);
    const r = recipe(1, "A", ["4 dl melk"]);
    const copy = structuredClone(r);
    buildShoppingList([{ recipe: r, servings: 8 }]);
    expect(r).toEqual(copy);
  });

  it("områder legges sammen i begge ender", () => {
    const list = buildShoppingList([
      { recipe: recipe(1, "A", ["1-2 ss olje"]), servings: 4 },
      { recipe: recipe(2, "B", ["2 ss olje"]), servings: 4 },
    ]);
    expect(texts(list)).toEqual(["3–4 ss olje"]);
  });
});

describe("splitByPantry", () => {
  const list = buildShoppingList([
    {
      recipe: recipe(1, "A", ["4 dl melk", "3 egg", "2 ss olivenolje", "1 dl olivenolje"]),
      servings: 4,
    },
  ]);

  it("flytter varer med samme navn til «hjemme», uavhengig av enhet og store bokstaver", () => {
    const { toBuy, atHome } = splitByPantry(list, [
      { id: 1, name: "Olivenolje" },
      { id: 2, name: "EGG" },
    ]);
    expect(texts(toBuy)).toEqual(["4 dl melk"]);
    expect(texts(atHome)).toEqual(["3 egg", "1 dl olivenolje", "2 ss olivenolje"]);
  });

  it("gir alt i «å kjøpe» når ingenting er hjemme, og beholder rekkefølgen", () => {
    const { toBuy, atHome } = splitByPantry(list, []);
    expect(toBuy).toEqual(list);
    expect(atHome).toEqual([]);
  });

  it("matcher bare helt like navn, ikke deler av navn", () => {
    const { toBuy } = splitByPantry(list, [
      { id: 1, name: "oli" },
      { id: 2, name: "mel" },
    ]);
    expect(toBuy).toHaveLength(list.length);
  });
});
