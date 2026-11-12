import { describe, expect, it } from "vitest";
import { joinSections, sectionHeading, splitSections } from "./ingredient-sections";

describe("sectionHeading", () => {
  it("kjenner «Fyll:» og «# Fyll»", () => {
    expect(sectionHeading("Fyll:")).toBe("Fyll");
    expect(sectionHeading("  Kanelboller :  ")).toBe("Kanelboller");
    expect(sectionHeading("# Fyll")).toBe("Fyll");
    expect(sectionHeading("## Fyll:")).toBe("Fyll");
  });
  it("lar vanlige ingredienser være", () => {
    expect(sectionHeading("400 g mel")).toBeNull();
    expect(sectionHeading("Fyll: smør og sukker")).toBeNull();
    expect(sectionHeading(":")).toBeNull();
    expect(sectionHeading("#")).toBeNull();
    expect(sectionHeading(`${"a".repeat(61)}:`)).toBeNull();
  });
});

describe("splitSections", () => {
  it("gir hver linje listen den står under", () => {
    expect(splitSections(["1 egg", "Deig:", "5 dl mel", "Fyll:", "100 g smør"])).toEqual([
      { text: "1 egg", section: null },
      { text: "5 dl mel", section: "Deig" },
      { text: "100 g smør", section: "Fyll" },
    ]);
  });
  it("uten overskrifter er alt uten liste, og tom overskrift gir ingenting", () => {
    expect(splitSections(["1 egg"])).toEqual([{ text: "1 egg", section: null }]);
    expect(splitSections(["Fyll:"])).toEqual([]);
  });
});

describe("joinSections", () => {
  it("er det motsatte av splitSections", () => {
    const lines = ["1 egg", "Deig:", "5 dl mel", "Fyll:", "100 g smør"];
    expect(joinSections(splitSections(lines))).toEqual(lines);
  });
});
