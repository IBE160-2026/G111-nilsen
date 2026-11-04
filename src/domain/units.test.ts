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
    expect(normalizeUnit("klype")).toBeNull();
    expect(normalizeUnit("")).toBeNull();
  });

  it("hver variant hører til nøyaktig én nøkkel", () => {
    const all = Object.values(UNIT_VARIANTS).flat();
    expect(new Set(all).size).toBe(all.length);
  });
});
