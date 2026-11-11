import { describe, expect, it } from "vitest";
import { parseRecipeText } from "./parse-recipe-text";

describe("parseRecipeText", () => {
  it("deler en tekst med overskrifter i tittel, porsjoner, tid, ingredienser og steg", () => {
    const d = parseRecipeText(`Pannekaker
4 porsjoner
Tid: 30 min

Ingredienser:
- 3 dl hvetemel
- 5 dl melk
• 2 egg
Til steking:
smør

Fremgangsmåte
1. Visp alt sammen.
2) La røre svelle i 10 minutter.
Steg 3: Stek i smør.`);
    expect(d).toEqual({
      title: "Pannekaker",
      servings: "4",
      minutes: "30",
      ingredients: "3 dl hvetemel\n5 dl melk\n2 egg\nsmør",
      steps: "Visp alt sammen.\nLa røre svelle i 10 minutter.\nStek i smør.",
    });
  });

  it("leser porsjoner på flere måter og tid i timer og minutter", () => {
    expect(parseRecipeText("A\nPorsjoner: 6\nIngredienser\n1 egg").servings).toBe("6");
    expect(parseRecipeText("A\nTil 2 personer\nIngredienser\n1 egg").servings).toBe("2");
    expect(parseRecipeText("A\nTotal tid: 1 time 30 min\nIngredienser\n1 egg").minutes).toBe("90");
    expect(parseRecipeText("A\nTid: 2 timer\nIngredienser\n1 egg").minutes).toBe("120");
  });

  it("gjetter uten overskrifter: mengde og kulepunkter er ingredienser, resten steg", () => {
    const d = parseRecipeText(`Eggerøre
4 egg
1 ss smør
Pisk eggene og stek dem forsiktig i smøret til de så vidt har stivnet, rør hele tiden.`);
    expect(d.title).toBe("Eggerøre");
    expect(d.ingredients).toBe("4 egg\n1 ss smør");
    expect(d.steps).toBe(
      "Pisk eggene og stek dem forsiktig i smøret til de så vidt har stivnet, rør hele tiden.",
    );
  });

  it("hopper over ingress mellom tittel og overskrift, og tåler Windows-linjeskift og tomme linjer", () => {
    const d = parseRecipeText(
      "Suppe\r\n\r\nEn god suppe til alle.\r\n\r\nDu trenger\r\n2 gulrøtter\r\n\r\nSlik gjør du\r\nKok.",
    );
    expect(d.title).toBe("Suppe");
    expect(d.ingredients).toBe("2 gulrøtter");
    expect(d.steps).toBe("Kok.");
  });

  it("gir tomt utkast for tom tekst", () => {
    expect(parseRecipeText("  \n ")).toEqual({
      title: "",
      servings: "",
      minutes: "",
      ingredients: "",
      steps: "",
    });
  });
});
