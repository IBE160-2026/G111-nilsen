import { describe, expect, it } from "vitest";
import { formatLine } from "./format-quantity";
import { parseLine } from "./parse-line";
import { scaleLine } from "./scale-line";

/** Visning slik spesifikasjonen definerer den: tolk, skaler med valgt/opprinnelig, formater. */
function show(input: string, chosen: number, original = 4): string {
  return formatLine(scaleLine(parseLine(input), chosen / original));
}

describe("scaleLine – fasit fra PRD FR-8 (opprinnelig 4)", () => {
  it("FR-8 #1: 400 g mel → 6 gir 600 g mel", () => {
    expect(show("400 g mel", 6)).toBe("600 g mel");
  });

  it("FR-8 #2: ½ ts salt → 6 gir ¾ ts salt", () => {
    expect(show("½ ts salt", 6)).toBe("¾ ts salt");
  });

  it("FR-8 #3: 1 ½ dl fløte → 2 gir ¾ dl fløte", () => {
    expect(show("1 ½ dl fløte", 2)).toBe("¾ dl fløte");
  });

  it("FR-8 #4: 0,5 dl olje → 8 gir 1 dl olje", () => {
    expect(show("0,5 dl olje", 8)).toBe("1 dl olje");
  });

  it("FR-8 #5: 1 egg → 3 gir 1 egg (ca.)", () => {
    expect(show("1 egg", 3)).toBe("1 egg (ca.)");
  });

  it("FR-8 #6: 2 egg → 3 gir 2 egg (ca.)", () => {
    expect(show("2 egg", 3)).toBe("2 egg (ca.)");
  });

  it("FR-8 #7: 2–3 ss sukker → 8 gir 4–6 ss sukker", () => {
    expect(show("2–3 ss sukker", 8)).toBe("4–6 ss sukker");
  });

  it("FR-8 #8: en klype salt → 8 gir en klype salt", () => {
    expect(show("en klype salt", 8)).toBe("en klype salt");
  });

  it("FR-8 #9: 1 fedd hvitløk → 2 gir 1 fedd hvitløk (ca.)", () => {
    expect(show("1 fedd hvitløk", 2)).toBe("1 fedd hvitløk (ca.)");
  });

  it("FR-8 #10: 750 g potet → 3 gir 560 g potet", () => {
    expect(show("750 g potet", 3)).toBe("560 g potet");
  });
});

describe("scaleLine – øvrige rader i matrisen", () => {
  it("g under 100 avrundes til hele tall: 50 g smør → 3 gir 38 g smør", () => {
    expect(show("50 g smør", 3)).toBe("38 g smør");
  });

  it("faktor 1 gir linjen uendret: ½ sitron → 4", () => {
    const line = parseLine("½ sitron");
    const scaled = scaleLine(line, 1);
    expect(scaled).toEqual({ ...line, approximate: false });
    expect(formatLine(scaled)).toBe("½ sitron");
  });

  it("udelelig uten endring merkes ikke «ca.»: 2 løk → 8 gir 4 løk", () => {
    expect(show("2 løk", 8)).toBe("4 løk");
  });

  it("desimal når ingen brøk passer: 0,9 dl melk → 5 gir 1,1 dl melk", () => {
    expect(show("0,9 dl melk", 5)).toBe("1,1 dl melk");
  });

  it("blandet tall i visning: 1 ss olje → 5 gir 1 ¼ ss olje", () => {
    expect(show("1 ss olje", 5)).toBe("1 ¼ ss olje");
  });

  it.each([0, Number.NaN, -1, Number.POSITIVE_INFINITY])(
    "ugyldig faktor %s gir linjen uendret og kaster ikke",
    (factor) => {
      const line = parseLine("400 g mel");
      expect(() => scaleLine(line, factor)).not.toThrow();
      const scaled = scaleLine(line, factor);
      expect(scaled).toEqual({ ...line, approximate: false });
      expect(formatLine(scaled)).toBe("400 g mel");
    },
  );
});

describe("scaleLine – regel (c) for g og ml", () => {
  it("100 g med faktor 1,25 gir 130 g (125 → to gjeldende sifre, halvdeler opp)", () => {
    expect(scaleLine(parseLine("100 g mel"), 1.25).quantity).toEqual({ min: 130 });
  });

  it("0,3 g med faktor 1 er uendret", () => {
    expect(scaleLine(parseLine("0,3 g safran"), 1).quantity).toEqual({ min: 0.3 });
  });

  it("0,3 g med faktor 2 gir 1 g (minst 1)", () => {
    expect(scaleLine(parseLine("0,3 g safran"), 2).quantity).toEqual({ min: 1 });
  });

  it("ml følger samme regel: 250 ml melk med faktor 1,5 gir 380 ml", () => {
    expect(scaleLine(parseLine("250 ml melk"), 1.5).quantity).toEqual({ min: 380 });
  });
});

describe("scaleLine – område", () => {
  it("skalerer hver ende for seg", () => {
    expect(scaleLine(parseLine("2–3 ss sukker"), 0.5).quantity).toEqual({ min: 1, max: 1.5 });
  });

  it("fjerner max når den blir lik min etter avrunding", () => {
    expect(scaleLine(parseLine("1–2 egg"), 0.25)).toMatchObject({
      quantity: { min: 1 },
      approximate: true,
    });
  });
});

describe("scaleLine – originalen er fasit (AD-2)", () => {
  it("skalering med 0,75 og deretter 1,25 gir samme resultat som fra originalen", () => {
    const line = parseLine("750 g potet");
    const first = scaleLine(line, 0.75);
    const second = scaleLine(line, 1.25);
    expect(first.quantity).toEqual({ min: 560 });
    expect(second).toEqual(scaleLine(parseLine("750 g potet"), 1.25));
    expect(second.quantity).toEqual({ min: 940 });
  });

  it("endrer ikke originalobjektet", () => {
    const line = parseLine("2–3 ss sukker");
    const snapshot = structuredClone(line);
    scaleLine(line, 2);
    scaleLine(line, 0.5);
    expect(line).toEqual(snapshot);
  });

  it("ikke tolkbare linjer skaleres aldri", () => {
    const line = parseLine("salt og pepper");
    expect(scaleLine(line, 3)).toEqual({ ...line, approximate: false });
  });
});
