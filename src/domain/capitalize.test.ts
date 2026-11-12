import { describe, expect, it } from "vitest";
import { capitalizeFirst, capitalizeName, capitalizeSentences } from "./capitalize";

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

describe("capitalizeName", () => {
  it("gjør navnet i en mengdelinje stort, også med «(ca.)» bak", () => {
    expect(capitalizeName("2 dl melk", "melk")).toBe("2 dl Melk");
    expect(capitalizeName("1 egg (ca.)", "egg")).toBe("1 Egg (ca.)");
    expect(capitalizeName("2 ss", "")).toBe("2 ss");
  });
  it("uten mengde, eller når navnet ikke står i teksten, blir første bokstav stor", () => {
    expect(capitalizeName("salt og pepper", "salt og pepper")).toBe("Salt og pepper");
    expect(capitalizeName("salt og pepper", "")).toBe("Salt og pepper");
    expect(capitalizeName("2 dl melk", "fløte")).toBe("2 dl melk");
  });
  it("bruker siste forekomst av navnet", () => {
    expect(capitalizeName("1 l l", "l")).toBe("1 l L");
  });
});
