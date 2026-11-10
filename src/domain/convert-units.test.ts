import { describe, expect, it } from "vitest";
import { convertLine, hasConvertibleUnit } from "./convert-units";
import { formatLine } from "./format-quantity";
import { parseLine } from "./parse-line";
import { scaleLine } from "./scale-line";

const line = (text: string, factor = 1) => scaleLine(parseLine(text), factor);
const metric = (text: string, factor = 1) => formatLine(convertLine(line(text, factor), "metric"));

describe("convertLine", () => {
  it("original gir linjen uendret", () => {
    const l = line("2 cups flour");
    expect(convertLine(l, "original")).toBe(l);
  });

  it.each([
    ["1 cup milk", "2,4 dl milk (ca.)"],
    ["½ cup sugar", "1,2 dl sugar (ca.)"],
    ["¼ cup oil", "0,6 dl oil (ca.)"],
    ["3 cups flour", "7,2 dl flour (ca.)"],
    ["5 cups water", "1,2 l water (ca.)"],
  ])("kopper: %s → %s", (input, expected) => {
    expect(metric(input)).toBe(expected);
  });

  it.each([
    ["8 oz cheese", "230 g cheese (ca.)"],
    ["1 lb beef", "450 g beef (ca.)"],
    ["3 lb potatoes", "1,4 kg potatoes (ca.)"],
  ])("vekt: %s → %s", (input, expected) => {
    expect(metric(input)).toBe(expected);
  });

  it.each([
    ["2 tbsp butter", "2 ss butter"],
    ["1 tsp salt", "1 ts salt"],
    ["1½ tbsp honey", "1 ½ ss honey"],
  ])("skjeer: %s → %s", (input, expected) => {
    expect(metric(input)).toBe(expected);
  });

  it("regner om etter skalering, og området omregnes begge ender", () => {
    expect(metric("1 cup milk", 2)).toBe("4,8 dl milk (ca.)");
    expect(metric("1-2 cups stock")).toBe("2,4–4,8 dl stock (ca.)");
  });

  it("linjer med norske eller uten enheter røres ikke", () => {
    for (const text of ["4 dl melk", "400 g mel", "3 egg", "salt og pepper", "2 cans tomatoes"]) {
      const l = line(text);
      expect(convertLine(l, "metric")).toEqual(l);
    }
  });

  it("endrer ikke inndata", () => {
    const l = line("1 cup milk");
    const copy = structuredClone(l);
    convertLine(l, "metric");
    expect(l).toEqual(copy);
  });

  it("hasConvertibleUnit", () => {
    expect(hasConvertibleUnit(parseLine("1 cup milk"))).toBe(true);
    expect(hasConvertibleUnit(parseLine("2 tbsp butter"))).toBe(true);
    expect(hasConvertibleUnit(parseLine("4 dl melk"))).toBe(false);
    expect(hasConvertibleUnit(parseLine("salt"))).toBe(false);
  });
});
