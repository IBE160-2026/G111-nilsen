import { describe, expect, it } from "vitest";
import { parseQuantity } from "./parse-quantity";

describe("parseQuantity", () => {
  it("heltall", () => {
    expect(parseQuantity("400 g mel")).toEqual({ quantity: { min: 400 }, rest: " g mel" });
  });

  it("desimal med komma", () => {
    expect(parseQuantity("0,5 dl olje")?.quantity).toEqual({ min: 0.5 });
  });

  it("desimal med punktum", () => {
    expect(parseQuantity("0.5 tsp salt")?.quantity).toEqual({ min: 0.5 });
  });

  it("brøk", () => {
    expect(parseQuantity("1/2 ts salt")).toEqual({ quantity: { min: 0.5 }, rest: " ts salt" });
  });

  it.each([
    ["½", 1 / 2],
    ["¼", 1 / 4],
    ["¾", 3 / 4],
    ["⅓", 1 / 3],
    ["⅔", 2 / 3],
    ["⅛", 1 / 8],
    ["⅕", 1 / 5],
    ["⅖", 2 / 5],
    ["⅗", 3 / 5],
    ["⅘", 4 / 5],
    ["⅙", 1 / 6],
    ["⅚", 5 / 6],
    ["⅜", 3 / 8],
    ["⅝", 5 / 8],
    ["⅞", 7 / 8],
  ])("brøktegn %s", (char, value) => {
    expect(parseQuantity(`${char} ts salt`)).toEqual({
      quantity: { min: value },
      rest: " ts salt",
    });
  });

  it.each(["1 ½ dl fløte", "1 1/2 dl fløte", "1½ dl fløte"])("blandet tall: %s", (text) => {
    expect(parseQuantity(text)).toEqual({ quantity: { min: 1.5 }, rest: " dl fløte" });
  });

  it.each(["2–3 ss sukker", "2-3 ss sukker", "2 til 3 ss sukker"])("område: %s", (text) => {
    expect(parseQuantity(text)).toEqual({ quantity: { min: 2, max: 3 }, rest: " ss sukker" });
  });

  it("brøk med brøkstrek (U+2044)", () => {
    expect(parseQuantity("1\u20442 ts salt")).toEqual({ quantity: { min: 0.5 }, rest: " ts salt" });
  });

  it("blandet tall med brøkstrek (U+2044)", () => {
    expect(parseQuantity("1 1\u20442 dl")?.quantity).toEqual({ min: 1.5 });
  });

  it("område med minustegn (U+2212)", () => {
    expect(parseQuantity("2\u22123 ss sukker")).toEqual({
      quantity: { min: 2, max: 3 },
      rest: " ss sukker",
    });
  });

  it("desimal uten null foran, med punktum", () => {
    expect(parseQuantity(".5 dl olje")).toEqual({ quantity: { min: 0.5 }, rest: " dl olje" });
  });

  it("desimal uten null foran, med komma", () => {
    expect(parseQuantity(",5 dl olje")).toEqual({ quantity: { min: 0.5 }, rest: " dl olje" });
  });

  it("amerikansk blandet tall med bindestrek er ikke et område", () => {
    expect(parseQuantity("1-1/2 cups flour")).toEqual({
      quantity: { min: 1.5 },
      rest: " cups flour",
    });
  });

  it("«område» der øvre ikke er større enn nedre gir bare nedre verdi", () => {
    expect(parseQuantity("3–2 ss")).toEqual({ quantity: { min: 3 }, rest: " ss" });
    expect(parseQuantity("2-2 ss")).toEqual({ quantity: { min: 2 }, rest: " ss" });
  });

  it("område med brøker", () => {
    expect(parseQuantity("½–1 ts salt")?.quantity).toEqual({ min: 0.5, max: 1 });
  });

  it("enhet rett etter tallet", () => {
    expect(parseQuantity("750g potet")).toEqual({ quantity: { min: 750 }, rest: "g potet" });
    expect(parseQuantity("2dl melk")).toEqual({ quantity: { min: 2 }, rest: "dl melk" });
  });

  it("«til» som ikke følges av et tall er ikke et område", () => {
    expect(parseQuantity("2 til steking")).toEqual({ quantity: { min: 2 }, rest: " til steking" });
  });

  it.each(["nutmeg", "salt og pepper", "en klype salt", "", "   "])(
    "gir null uten mengde: %j",
    (text) => {
      expect(parseQuantity(text)).toBeNull();
    },
  );
});
