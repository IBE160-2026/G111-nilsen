import { describe, expect, it } from "vitest";
import { validOriginalServings } from "./recipe-input";

describe("validOriginalServings", () => {
  it.each([
    [4, 4],
    [1, 1],
    [50, 50],
    [0, null],
    [51, null],
    [4.5, null],
    [-2, null],
    [null, null],
  ])("%s gir %s", (value, expected) => {
    expect(validOriginalServings(value)).toBe(expected);
  });
});
