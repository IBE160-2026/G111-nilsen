import { describe, expect, it } from "vitest";
import { convertLine, gramsPerDl, hasConvertibleUnit } from "./convert-units";
import { formatLine } from "./format-quantity";
import { parseLine } from "./parse-line";
import { scaleLine } from "./scale-line";

const line = (text: string, factor = 1) => scaleLine(parseLine(text), factor);
const metric = (text: string, factor = 1) => formatLine(convertLine(line(text, factor), "dl"));
const grams = (text: string, factor = 1) => formatLine(convertLine(line(text, factor), "gram"));

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
    for (const text of [
      "4 dl buljong",
      "400 g spagetti",
      "3 egg",
      "salt og pepper",
      "2 cans tomatoes",
    ]) {
      const l = line(text);
      expect(convertLine(l, "dl")).toEqual(l);
    }
  });

  it("endrer ikke inndata", () => {
    const l = line("1 cup milk");
    const copy = structuredClone(l);
    convertLine(l, "dl");
    expect(l).toEqual(copy);
  });

  it("hasConvertibleUnit", () => {
    expect(hasConvertibleUnit(parseLine("1 cup milk"))).toBe(true);
    expect(hasConvertibleUnit(parseLine("2 tbsp butter"))).toBe(true);
    expect(hasConvertibleUnit(parseLine("4 dl melk"))).toBe(true);
    expect(hasConvertibleUnit(parseLine("400 g mel"))).toBe(true);
    expect(hasConvertibleUnit(parseLine("4 dl buljong"))).toBe(false);
    expect(hasConvertibleUnit(parseLine("2 dl salt og pepper"))).toBe(false);
    expect(hasConvertibleUnit(parseLine("3 egg"))).toBe(false);
    expect(hasConvertibleUnit(parseLine("salt"))).toBe(false);
  });
});

describe("gramsPerDl", () => {
  it.each([
    ["mel", 60],
    ["hvetemel", 60],
    ["siktet hvetemel", 60],
    ["Sukker", 85],
    ["olivenolje", 90],
    ["smør", 90],
    ["melk", 100],
    ["kremfløte", 100],
    ["salt", 120],
    ["flour", 60],
    ["TINE® Meierismør", 90],
    ["lettmelk", 100],
    ["basmatiris", 85],
    ["fint sammalt hvetemel", 60],
  ])("%s → %s g/dl", (name, expected) => {
    expect(gramsPerDl(name)).toBe(expected);
  });

  it.each(["", "egg", "karamell", "caramel", "salt og pepper", "mel eller maisenna", "buljong"])(
    "%j er ikke kjent",
    (name) => {
      expect(gramsPerDl(name)).toBeNull();
    },
  );

  it("melk blir ikke tatt for mel", () => {
    expect(gramsPerDl("melk")).toBe(100);
    expect(gramsPerDl("potetmel")).toBe(80);
  });
});

describe("dl ↔ gram for kjente ingredienser", () => {
  it.each([
    ["400 g mel", "6 ⅔ dl mel (ca.)"],
    ["1 kg sukker", "1,2 l sukker (ca.)"],
    ["500 g smør", "5,6 dl smør (ca.)"],
    ["2 oz flour", "0,9 dl flour (ca.)"],
  ])("dl: %s → %s", (input, expected) => {
    expect(metric(input)).toBe(expected);
  });

  it.each([
    ["2 dl mel", "120 g mel (ca.)"],
    ["5 dl sukker", "430 g sukker (ca.)"],
    ["2 ss smør", "27 g smør (ca.)"],
    ["1 ts salt", "6 g salt (ca.)"],
    ["1 cup flour", "140 g flour (ca.)"],
    ["1 l melk", "1 kg melk (ca.)"],
    ["½ dl olje", "45 g olje (ca.)"],
    ["2–3 dl melk", "200–300 g melk (ca.)"],
  ])("gram: %s → %s", (input, expected) => {
    expect(grams(input)).toBe(expected);
  });

  it("regner etter skalering", () => {
    expect(grams("2 dl mel", 2)).toBe("240 g mel (ca.)");
  });

  it("dl-visning lar volum stå, og gram-visning lar vekt stå", () => {
    expect(metric("2 dl mel")).toBe("2 dl mel");
    expect(grams("400 g mel")).toBe("400 g mel");
  });

  it("ukjente ingredienser og stykk røres ikke", () => {
    for (const text of ["2 dl buljong", "3 egg", "2 dl salt og pepper"]) {
      expect(grams(text)).toBe(formatLine(line(text)));
      expect(metric(text)).toBe(formatLine(line(text)));
    }
  });

  it("kopper og pund uten kjent ingrediens regnes til norske mål i begge visninger", () => {
    expect(grams("1 cup milk")).toBe("240 g milk (ca.)");
    expect(grams("1 cup stock")).toBe("2,4 dl stock (ca.)");
    expect(grams("1 lb beef")).toBe("450 g beef (ca.)");
  });
});
