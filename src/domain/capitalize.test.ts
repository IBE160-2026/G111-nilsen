import { describe, expect, it } from "vitest";
import { capitalizeFirst, capitalizeSentences } from "./capitalize";

describe("capitalizeFirst", () => {
  it("gjør første bokstav stor, også æ, ø og å", () => {
    expect(capitalizeFirst("melk")).toBe("Melk");
    expect(capitalizeFirst("ærter")).toBe("Ærter");
    expect(capitalizeFirst("østers")).toBe("Østers");
    expect(capitalizeFirst("ål")).toBe("Ål");
  });
  it("lar resten stå, og endrer ikke tall, tegn eller tom tekst", () => {
    expect(capitalizeFirst("Hvete MEL")).toBe("Hvete MEL");
    expect(capitalizeFirst("2 egg")).toBe("2 egg");
    expect(capitalizeFirst("½ løk")).toBe("½ løk");
    expect(capitalizeFirst("(valgfritt) smør")).toBe("(valgfritt) smør");
    expect(capitalizeFirst("")).toBe("");
  });
});

describe("capitalizeSentences", () => {
  it("første bokstav og første bokstav etter punktum, utrop og spørsmål", () => {
    expect(capitalizeSentences("stek løken. tilsett kjøttet! smak til? server.")).toBe(
      "Stek løken. Tilsett kjøttet! Smak til? Server.",
    );
  });
  it("ikke etter forkortelser eller midt i tall", () => {
    expect(capitalizeSentences("la den stå ca. en time. så er den klar.")).toBe(
      "La den stå ca. en time. Så er den klar.",
    );
    expect(capitalizeSentences("bruk f.eks. smør. tilsett 1.5 dl melk.")).toBe(
      "Bruk f.eks. smør. Tilsett 1.5 dl melk.",
    );
    expect(capitalizeSentences("kok i 5 min. server")).toBe("Kok i 5 min. Server");
  });
  it("endrer ikke tekst som allerede er riktig", () => {
    const ok = "Stek i 10 min. Server med ris.";
    expect(capitalizeSentences(ok)).toBe(ok);
  });
});
