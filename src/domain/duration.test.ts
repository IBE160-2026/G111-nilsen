import { describe, expect, it } from "vitest";
import { formatMinutes, isRecipeMinutes, parseIsoDuration } from "./duration";

describe("parseIsoDuration", () => {
  it.each([
    ["PT45M", 45],
    ["PT1H15M", 75],
    ["PT1H", 60],
    ["PT90M", 90],
    ["P0DT2H0M", 120],
    ["P1D", 1440],
    ["PT1H30M0S", 90],
    ["PT30S", 1],
    ["pt20m", 20],
    [" PT10M ", 10],
  ])("%j gir %j minutter", (value, expected) => {
    expect(parseIsoDuration(value)).toBe(expected);
  });

  it.each([["P"], ["PT"], ["PT0M"], ["45"], ["45 min"], ["P2D"], [""], [null], [45], [undefined]])(
    "%j gir null",
    (value) => {
      expect(parseIsoDuration(value)).toBeNull();
    },
  );
});

describe("formatMinutes", () => {
  it.each([
    [5, "5 min"],
    [45, "45 min"],
    [60, "1 t"],
    [75, "1 t 15 min"],
    [1440, "24 t"],
  ])("%d gir %s", (minutes, expected) => {
    expect(formatMinutes(minutes)).toBe(expected);
  });
});

describe("isRecipeMinutes", () => {
  it("godtar hele minutter fra 1 til 1440", () => {
    expect([1, 45, 1440].every(isRecipeMinutes)).toBe(true);
    expect([0, 1441, 4.5, -1, Number.NaN, "45"].some(isRecipeMinutes)).toBe(false);
  });
});
