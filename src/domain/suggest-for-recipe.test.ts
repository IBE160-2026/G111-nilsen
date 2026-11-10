import { describe, expect, it } from "vitest";
import { parseLine } from "./parse-line";
import { suggestForRecipe } from "./suggest-for-recipe";

function recipe(title: string, ingredients: string[], steps: string[] = []) {
  return {
    title,
    ingredients: ingredients.map((text) => parseLine(text)),
    steps: steps.map((text) => ({ text })),
  };
}
const texts = (r: ReturnType<typeof recipe>) => suggestForRecipe(r).map((s) => s.text);

const pannekaker = recipe(
  "Grove pannekaker",
  ["50 g smør", "3 dl lettmelk", "3 stk egg", "5 dl hvetemel", "1 ss sukker", "1 ts salt"],
  ["Visp sammen mel og melk.", "Stek tynne pannekaker i smør."],
);
const kjottboller = recipe(
  "Kjøttboller i tomatsaus",
  [
    "ukokt 3 dl ris , gjerne basmatiris",
    "500 g kjøttdeig",
    "1 stykk egg",
    "knuste 400 g hermetiske tomater",
  ],
  ["Form boller og stek dem.", "Kok risen."],
);
const rundstykker = recipe(
  "Rundstykker",
  ["ca. 1 l hvetemel (550 g)", "25 g gjær", "2,5 dl melk", "1 ts sukker", "0,5 ts salt"],
  ["Elt deigen og la den heve.", "Stek i ovnen."],
);

describe("suggestForRecipe", () => {
  it("pannekaker: hvile røren, smak og servering", () => {
    expect(texts(pannekaker)).toEqual([
      "La røren hvile i 20–30 minutter før du begynner å steke.",
      "Ha en teskje vaniljesukker eller kardemomme i røren.",
      "Server med friske bær og rømme, eller med syltetøy og litt sukker.",
    ]);
  });

  it("kjøttboller: råd om deigen først, så om tomatsaus", () => {
    const list = texts(kjottboller);
    expect(list).toHaveLength(3);
    expect(list[0]).toContain("kjøttdeigen");
    expect(list[1]).toContain("hvile kaldt");
    expect(list[2]).toContain("tomatsausen");
  });

  it("rundstykker: råd for gjærbakst", () => {
    const list = texts(rundstykker);
    expect(list).toHaveLength(3);
    expect(list.join(" ")).toContain("Pensle");
    expect(list.join(" ")).toContain("grovt mel");
    expect(list.join(" ")).toContain("varmt vann nederst i ovnen");
    expect(list.join(" ")).not.toContain("pannekak");
  });

  it("hopper over råd oppskriften allerede følger", () => {
    const list = texts(
      recipe(
        "Pannekaker",
        ["3 egg", "3 dl melk", "2 dl hvetemel", "1 ts vaniljesukker"],
        ["La røren hvile en halvtime.", "Stek."],
      ),
    );
    expect(list.join(" ")).not.toContain("hvile i 20");
    expect(list.join(" ")).not.toContain("vaniljesukker");
    expect(list.length).toBeGreaterThan(0);
  });

  it("gir forslag med forklaring og gyldig del av oppskriften", () => {
    for (const r of [pannekaker, kjottboller, rundstykker]) {
      for (const s of suggestForRecipe(r)) {
        expect(s.text.length).toBeGreaterThan(0);
        expect(s.text.length).toBeLessThanOrEqual(300);
        expect(s.reason.length).toBeGreaterThan(0);
        expect(s.reason.length).toBeLessThanOrEqual(400);
        expect(["ingredients", "steps", "recipe"]).toContain(s.appliesTo);
      }
    }
  });

  it.each([
    ["Pasta med tomatsaus", ["400 g spaghetti", "1 boks hakkede tomater", "1 løk"], "kokevannet"],
    ["Laks i ovn", ["600 g laks", "1 ss olje"], "flaker seg"],
    ["Kylling med ris", ["4 kyllingfilet", "3 dl ris"], "75 °C"],
    ["Grønnsakssuppe", ["1 l buljong", "2 gulrøtter", "1 potet"], "sitron eller eddik"],
    [
      "Sjokoladekake",
      ["3 egg", "2 dl sukker", "3 dl hvetemel", "2 ts bakepulver"],
      "Forvarm ovnen",
    ],
    ["Kikertgryte", ["2 bokser kikerter", "1 løk"], "Skyll"],
  ])("%s får et passende råd", (title, ingredients, expected) => {
    expect(texts(recipe(title, ingredients)).join(" ")).toContain(expected);
  });

  it("gir ingenting når oppskriften ikke passer noen gruppe, og kaster ikke på tom oppskrift", () => {
    expect(texts(recipe("Smoothie", ["1 banan", "2 dl juice"]))).toEqual([]);
    expect(suggestForRecipe({ title: "", ingredients: [], steps: [] })).toEqual([]);
  });

  it("gir ikke mer enn tre, ingen duplikater, og samme svar hver gang", () => {
    const r = recipe("Kylling i tomatsaus med ris og pasta", [
      "4 kyllingfilet",
      "400 g spaghetti",
      "3 dl ris",
      "1 boks tomater",
      "1 løk",
      "2 potet",
    ]);
    const first = texts(r);
    expect(first.length).toBeLessThanOrEqual(3);
    expect(new Set(first).size).toBe(first.length);
    expect(texts(r)).toEqual(first);
  });

  it("melk regnes ikke som mel, og pannekake regnes ikke som kake", () => {
    const list = texts(recipe("Pannekaker", ["3 dl melk", "1 dl sukker"]));
    expect(list.join(" ")).not.toContain("Forvarm");
    const milk = texts(recipe("Drikke", ["3 dl melk", "1 ts sukker"]));
    expect(milk).toEqual([]);
  });
});
