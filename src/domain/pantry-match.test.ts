import { describe, expect, it } from "vitest";
import { ingredientLabel, matchPantry, type PantryRecipe } from "./pantry-match";

const recipe = (id: number, title: string, ingredients: string[]): PantryRecipe => ({
  id,
  title,
  ingredients,
});
const pantry = (...names: string[]) => names.map((name, index) => ({ id: index + 1, name }));

describe("ingredientLabel", () => {
  it("bruker navnet uten mengde når linjen er tolket, ellers linjen som den er skrevet", () => {
    expect(ingredientLabel({ parseable: true, name: " melk ", original: "2 dl melk" })).toBe(
      "melk",
    );
    expect(ingredientLabel({ parseable: false, name: "salt", original: " salt og pepper " })).toBe(
      "salt og pepper",
    );
    expect(ingredientLabel({ parseable: true, name: "  ", original: "litt vann" })).toBe(
      "litt vann",
    );
  });
});

describe("matchPantry", () => {
  it("gir ingenting uten noe hjemme (eller bare tomme navn), og ingenting uten treff", () => {
    const recipes = [recipe(1, "Pannekaker", ["egg", "melk"])];
    expect(matchPantry(recipes, [])).toEqual([]);
    expect(matchPantry(recipes, pantry("", "  ", "!!"))).toEqual([]);
    expect(matchPantry(recipes, pantry("sjokolade"))).toEqual([]);
    expect(matchPantry([], pantry("egg"))).toEqual([]);
  });

  it("deler ingrediensene i hjemme og mangler, i oppskriftens rekkefølge", () => {
    const [match] = matchPantry(
      [recipe(1, "Pannekaker", ["hvetemel", "egg", "melk", "smør"])],
      pantry("Melk", "egg"),
    );
    expect(match).toEqual({
      id: 1,
      title: "Pannekaker",
      have: ["egg", "melk"],
      missing: ["hvetemel", "smør"],
    });
  });

  it("alle ordene i det du har hjemme må stå i ingrediensen, som hele ord", () => {
    const recipes = [recipe(1, "R", ["usaltet smør", "melis", "kokosmelk", "helmelk", "mel"])];
    const [match] = matchPantry(recipes, pantry("smør", "mel", "melk"));
    expect(match?.have).toEqual(["usaltet smør", "mel"]);
    expect(match?.missing).toEqual(["melis", "kokosmelk", "helmelk"]);
    // Flere ord: alle må være med.
    expect(matchPantry([recipe(1, "R", ["rød paprika"])], pantry("rød løk"))).toEqual([]);
    expect(matchPantry([recipe(1, "R", ["rød paprika"])], pantry("paprika rød"))).toHaveLength(1);
  });

  it("ser bort fra store og små bokstaver og tegnsetting, og æ, ø og å virker", () => {
    const [match] = matchPantry(
      [recipe(1, "R", ["Smør, usaltet", "ÆRTER", "gul løk (stor)"])],
      pantry("SMØR", "ærter", "løk"),
    );
    expect(match?.have).toEqual(["Smør, usaltet", "ÆRTER", "gul løk (stor)"]);
  });

  it("hver ingrediens teller én gang per oppskrift, og tomme tekster hoppes over", () => {
    const [match] = matchPantry(
      [recipe(1, "R", ["egg", "Egg", " ", "melk", "melk"])],
      pantry("egg"),
    );
    expect(match).toMatchObject({ have: ["egg"], missing: ["melk"] });
  });

  it("sorterer færrest som mangler først, så flest hjemme, så tittel (norsk), så id", () => {
    const result = matchPantry(
      [
        recipe(1, "Åre", ["egg", "melk"]),
        recipe(2, "Ananas", ["egg", "melk"]),
        recipe(3, "Mangler en", ["egg", "melk", "mel"]),
        recipe(4, "Mangler to men mer hjemme", ["egg", "melk", "mel", "sukker"]),
        recipe(5, "Ære", ["egg", "melk"]),
        recipe(6, "Ære", ["egg", "melk"]),
        recipe(7, "Bare ett", ["egg"]),
      ],
      pantry("egg", "melk"),
    );
    expect(result.map((x) => x.id)).toEqual([2, 5, 6, 1, 7, 3, 4]);
  });

  it("endrer ikke inndataene", () => {
    const recipes = [recipe(1, "R", ["egg", "melk"])];
    const home = pantry("egg");
    const before = JSON.stringify([recipes, home]);
    matchPantry(recipes, home);
    expect(JSON.stringify([recipes, home])).toBe(before);
  });
});
