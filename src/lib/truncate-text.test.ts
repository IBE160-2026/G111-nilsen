import { describe, expect, it } from "vitest";
import { truncateText } from "./truncate-text";

describe("truncateText", () => {
  it("lar tekst innenfor grensen være uendret", () => {
    expect(truncateText("abc", 3)).toBe("abc");
    expect(truncateText("", 5)).toBe("");
  });

  it("avkorter og ender på «…» innenfor grensen", () => {
    const result = truncateText("a".repeat(500), 200);
    expect(result).toHaveLength(200);
    expect(result.endsWith("…")).toBe(true);
    expect(result).toBe(`${"a".repeat(199)}…`);
  });

  it("fjerner mellomrom foran «…»", () => {
    expect(truncateText("abc def ghi", 5)).toBe("abc…");
  });

  it("deler aldri et surrogatpar", () => {
    const result = truncateText("😀".repeat(10), 6);
    expect(result.length).toBeLessThanOrEqual(6);
    expect(result).toBe("😀😀…");
    expect(Array.from(result).every((c) => c !== "�")).toBe(true);
  });

  it("kantgrenser", () => {
    expect(truncateText("abc", 1)).toBe("…");
    expect(truncateText("abc", 0)).toBe("");
  });
});
