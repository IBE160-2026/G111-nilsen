import { describe, expect, it } from "vitest";
import { parseLine } from "./parse-line";
import type { ParsedLine } from "./types";

function line(
  original: string,
  quantity: ParsedLine["quantity"],
  unit: ParsedLine["unit"],
  name: string,
  parseable = true,
): ParsedLine {
  return { original, quantity, unit, name, parseable };
}

describe("parseLine – matrisen i spesifikasjonen", () => {
  it("heltall + enhet", () => {
    expect(parseLine("400 g mel")).toEqual(line("400 g mel", { min: 400 }, "g", "mel"));
  });

  it("desimal med komma", () => {
    expect(parseLine("0,5 dl olje")).toEqual(line("0,5 dl olje", { min: 0.5 }, "dl", "olje"));
  });

  it("desimal med punktum", () => {
    expect(parseLine("0.5 tsp salt")).toEqual(line("0.5 tsp salt", { min: 0.5 }, "tsp", "salt"));
  });

  it("brøk", () => {
    expect(parseLine("1/2 ts salt")).toEqual(line("1/2 ts salt", { min: 0.5 }, "ts", "salt"));
  });

  it("brøktegn", () => {
    expect(parseLine("½ ts salt")).toEqual(line("½ ts salt", { min: 0.5 }, "ts", "salt"));
  });

  it.each(["1 ½ dl fløte", "1 1/2 dl fløte", "1½ dl fløte"])("blandet tall: %s", (text) => {
    expect(parseLine(text)).toEqual(line(text, { min: 1.5 }, "dl", "fløte"));
  });

  it.each(["2–3 ss sukker", "2-3 ss sukker", "2 til 3 ss sukker"])("område: %s", (text) => {
    expect(parseLine(text)).toEqual(line(text, { min: 2, max: 3 }, "ss", "sukker"));
  });

  it("enhet uten mellomrom", () => {
    expect(parseLine("750g potet")).toEqual(line("750g potet", { min: 750 }, "g", "potet"));
    expect(parseLine("2dl melk")).toEqual(line("2dl melk", { min: 2 }, "dl", "melk"));
  });

  it("uten enhet", () => {
    expect(parseLine("2 egg")).toEqual(line("2 egg", { min: 2 }, null, "egg"));
  });

  it("mengde uten navn", () => {
    expect(parseLine("2 ss")).toEqual(line("2 ss", { min: 2 }, "ss", ""));
  });

  it.each(["nutmeg", "salt og pepper", "en klype salt"])("uten mengde: %s", (text) => {
    expect(parseLine(text)).toEqual(line(text, null, null, text, false));
  });

  it("«ca.» foran", () => {
    expect(parseLine("ca. 400 g kjøttdeig")).toEqual(
      line("ca. 400 g kjøttdeig", { min: 400 }, "g", "kjøttdeig"),
    );
  });

  it("store bokstaver og punktum etter enhet", () => {
    expect(parseLine("2 SS. sukker")).toEqual(line("2 SS. sukker", { min: 2 }, "ss", "sukker"));
    expect(parseLine("3 stk. egg")).toEqual(line("3 stk. egg", { min: 3 }, "stk", "egg"));
  });

  it.each([
    ["1 tbsp butter", { min: 1 }, "tbsp", "butter"],
    ["2 cups flour", { min: 2 }, "cup", "flour"],
    ["8 oz cheese", { min: 8 }, "oz", "cheese"],
    ["1 lb beef", { min: 1 }, "lb", "beef"],
  ] as const)("engelske enheter: %s", (text, quantity, unit, name) => {
    expect(parseLine(text)).toEqual(line(text, quantity, unit, name));
  });

  it("ukjent ord etter tall blir en del av navnet", () => {
    expect(parseLine("1 dash smør")).toEqual(line("1 dash smør", { min: 1 }, null, "dash smør"));
  });

  it.each(["", "   "])("tom eller bare mellomrom: %j", (text) => {
    expect(() => parseLine(text)).not.toThrow();
    expect(parseLine(text)).toEqual(line(text, null, null, "", false));
  });
});

describe("parseLine – øvrige regler", () => {
  it("originalteksten bevares uendret, også med mellomrom rundt", () => {
    expect(parseLine("  400 g mel ").original).toBe("  400 g mel ");
    expect(parseLine("  400 g mel ").name).toBe("mel");
  });

  it("«ca» fjernes bare når en mengde følger", () => {
    expect(parseLine("cayennepepper")).toEqual(
      line("cayennepepper", null, null, "cayennepepper", false),
    );
    expect(parseLine("ca 2 dl melk").quantity).toEqual({ min: 2 });
  });

  it("enhetsord inne i et lengre ord gjenkjennes ikke som enhet", () => {
    expect(parseLine("2 gulrøtter")).toEqual(line("2 gulrøtter", { min: 2 }, null, "gulrøtter"));
  });

  it("skilletegn foran navnet fjernes", () => {
    expect(parseLine("400 g, finhakket løk")).toEqual(
      line("400 g, finhakket løk", { min: 400 }, "g", "finhakket løk"),
    );
    expect(parseLine("2 stk.egg")).toEqual(line("2 stk.egg", { min: 2 }, "stk", "egg"));
  });

  it("lange enhetsnavn", () => {
    expect(parseLine("500 gram mel")).toEqual(line("500 gram mel", { min: 500 }, "g", "mel"));
    expect(parseLine("2 kryddermål salt")).toEqual(
      line("2 kryddermål salt", { min: 2 }, "krm", "salt"),
    );
  });

  it("tekst i NFD-form tolkes, og originalen bevares uendret", () => {
    const nfd = "2 kryddermål salt".normalize("NFD");
    expect(nfd).not.toBe("2 kryddermål salt");
    expect(parseLine(nfd)).toEqual(line(nfd, { min: 2 }, "krm", "salt"));
  });

  it("amerikansk blandet tall med bindestrek", () => {
    expect(parseLine("1-1/2 cups flour")).toEqual(
      line("1-1/2 cups flour", { min: 1.5 }, "cup", "flour"),
    );
  });

  it("«område» med øvre ikke større enn nedre", () => {
    expect(parseLine("3–2 ss")).toEqual(line("3–2 ss", { min: 3 }, "ss", ""));
  });

  it("linje med flere tall: bare det første tolkes (låser dagens atferd)", () => {
    expect(parseLine("1 boks (400 g) tomater")).toEqual(
      line("1 boks (400 g) tomater", { min: 1 }, "boks", "(400 g) tomater"),
    );
  });

  it("kaster ikke for vilkårlig tekst", () => {
    for (const text of ["1/0 ts", "—", "½½", "2 –", "til 3", "\n\t", "ca."]) {
      expect(() => parseLine(text)).not.toThrow();
      expect(parseLine(text).original).toBe(text);
    }
  });
});

describe("parseLine – enhet klistret på navnet (kopiert fra oppskriftssider, issue 005)", () => {
  it.each([
    ["½ tssalt (kan sløyfes)", { min: 0.5 }, "ts", "salt (kan sløyfes)"],
    ["6 dlTINE® Lettmelk 1,0 % fett.", { min: 6 }, "dl", "TINE® Lettmelk 1,0 % fett."],
    ["3 stkegg, helst romtemperert", { min: 3 }, "stk", "egg, helst romtemperert"],
    ["3 ssTINE® Meierismør til steking.", { min: 3 }, "ss", "TINE® Meierismør til steking."],
    ["2 krmpepper", { min: 2 }, "krm", "pepper"],
    ["1 tbspbutter", { min: 1 }, "tbsp", "butter"],
    ["500 mlmelk", { min: 500 }, "ml", "melk"],
    ["½tssalt", { min: 0.5 }, "ts", "salt"],
    ["2 feddhvitløk", { min: 2 }, "fedd", "hvitløk"],
    ["1 tbsbutter", { min: 1 }, "tbsp", "butter"],
    ["2–3 ssmel", { min: 2, max: 3 }, "ss", "mel"],
    ["ca. 2 dlfløte", { min: 2 }, "dl", "fløte"],
  ] as const)("%s", (text, quantity, unit, name) => {
    expect(parseLine(text)).toEqual(line(text, quantity, unit, name));
  });

  it.each(["2 gulrøtter", "1 løk", "2 grønne epler", "3 egg", "1 dash smør"])(
    "skiller ikke ut g, l eller andre ord: %s",
    (text) => {
      expect(parseLine(text).unit).toBeNull();
    },
  );

  it("krever minst to bokstaver etter enheten", () => {
    expect(parseLine("2 dle").unit).toBeNull();
  });

  it("kjent grense: ord som starter med en forkortelse får enheten (tsatsiki)", () => {
    expect(parseLine("1 tsatsiki").unit).toBe("ts");
  });

  it("store bokstaver i enheten skilles ikke ut (kan være merkenavn)", () => {
    expect(parseLine("2 SSsukker").unit).toBeNull();
  });
});
