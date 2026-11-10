import { describe, expect, it } from "vitest";
import { parseLine } from "./parse-line";
import { ingredientsForStep } from "./step-ingredients";
import type { RecipeLine } from "./types";

const lines: RecipeLine[] = [
  "4 dl hvetemel",
  "6 dl melk",
  "3 egg",
  "½ ts salt",
  "2 ss smør til steking",
  "1 løk, finhakket",
  "salt og pepper",
].map((text, i) => ({ ...parseLine(text), id: i + 1, position: i + 1, section: null }));
const found = (step: string) => ingredientsForStep(step, lines).map((l) => l.original);

describe("ingredientsForStep", () => {
  it("finner ingredienser i bestemt form og som sammensetning", () => {
    expect(found("Bland mel og salt. Tilsett halvparten av melken.")).toEqual([
      "4 dl hvetemel",
      "6 dl melk",
      "½ ts salt",
      "salt og pepper",
    ]);
  });

  it("«mel» treffer ikke «melken», og «melk» treffer ikke «mel»", () => {
    expect(found("Visp inn melken.")).toEqual(["6 dl melk"]);
    expect(found("Sikt melet.")).toEqual(["4 dl hvetemel"]);
  });

  it("flertall, tilberedningsord og komma i navnet", () => {
    expect(found("Pisk eggene lett.")).toEqual(["3 egg"]);
    expect(found("Fres løken i smør.")).toEqual(["2 ss smør til steking", "1 løk, finhakket"]);
  });

  it("ord som bare er tilberedning eller småord gir ikke treff", () => {
    expect(found("Stek til gyllen farge, og server med litt revet ost.")).toEqual([]);
  });

  it("ingen treff gir tom liste, også for tom tekst", () => {
    expect(found("Sett ovnen på 200 grader.")).toEqual([]);
    expect(found("")).toEqual([]);
  });

  it("store og små bokstaver spiller ingen rolle, og rekkefølgen følger ingredienslisten", () => {
    expect(found("SMØR og EGG")).toEqual(["3 egg", "2 ss smør til steking"]);
  });

  it("endrer ikke inndata", () => {
    const copy = structuredClone(lines);
    found("Bland mel og salt.");
    expect(lines).toEqual(copy);
  });
});
