import { describe, expect, it } from "vitest";
import { normalizeUnit, UNIT_VARIANTS } from "./units";

describe("normalizeUnit", () => {
  it.each([
    ["g", "g"],
    ["kg", "kg"],
    ["ml", "ml"],
    ["dl", "dl"],
    ["l", "l"],
    ["ss", "ss"],
    ["ts", "ts"],
    ["krm", "krm"],
    ["stk", "stk"],
    ["fedd", "fedd"],
    ["pk", "pk"],
    ["pakke", "pk"],
    ["boks", "boks"],
    ["never", "neve"],
    ["neve", "neve"],
    ["tbsp", "tbsp"],
    ["tablespoon", "tbsp"],
    ["tablespoons", "tbsp"],
    ["tsp", "tsp"],
    ["teaspoon", "tsp"],
    ["teaspoons", "tsp"],
    ["cup", "cup"],
    ["cups", "cup"],
    ["oz", "oz"],
    ["lb", "lb"],
    // Lange og alternative varianter
    ["gr", "g"],
    ["gram", "g"],
    ["kilo", "kg"],
    ["kilogram", "kg"],
    ["milliliter", "ml"],
    ["desiliter", "dl"],
    ["liter", "l"],
    ["spiseskje", "ss"],
    ["spiseskjeer", "ss"],
    ["teskje", "ts"],
    ["teskjeer", "ts"],
    ["kryddermål", "krm"],
    ["stykk", "stk"],
    ["stykker", "stk"],
    ["pakker", "pk"],
    ["bokser", "boks"],
    ["tbs", "tbsp"],
    ["ounce", "oz"],
    ["ounces", "oz"],
    ["lbs", "lb"],
    ["pound", "lb"],
    ["pounds", "lb"],
    // Nye enheter
    ["klype", "klype"],
    ["klyper", "klype"],
    ["kopp", "kopp"],
    ["kopper", "kopp"],
    ["pose", "pose"],
    ["poser", "pose"],
    ["bunt", "bunt"],
    ["bunter", "bunt"],
    ["skive", "skive"],
    ["skiver", "skive"],
    ["glass", "glass"],
    ["beger", "beger"],
    ["pinch", "pinch"],
    ["pinches", "pinch"],
    ["can", "can"],
    ["cans", "can"],
  ])("%s → %s", (word, key) => {
    expect(normalizeUnit(word)).toBe(key);
  });

  it("er uavhengig av store/små bokstaver og punktum etter forkortelse", () => {
    expect(normalizeUnit("SS.")).toBe("ss");
    expect(normalizeUnit("stk.")).toBe("stk");
    expect(normalizeUnit("Dl")).toBe("dl");
    expect(normalizeUnit("TBSP.")).toBe("tbsp");
  });

  it("gir null for ukjente ord", () => {
    expect(normalizeUnit("dash")).toBeNull();
    expect(normalizeUnit("egg")).toBeNull();
    expect(normalizeUnit("mel")).toBeNull();
    expect(normalizeUnit("")).toBeNull();
  });

  it("gjenkjenner tekst i NFD-form", () => {
    expect(normalizeUnit("kryddermål".normalize("NFD"))).toBe("krm");
  });

  it("hver variant hører til nøyaktig én nøkkel", () => {
    const all = Object.values(UNIT_VARIANTS).flat();
    expect(new Set(all).size).toBe(all.length);
  });
});
