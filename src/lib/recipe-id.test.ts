import { describe, expect, it } from "vitest";
import { parseRecipeId } from "./recipe-id";

describe("parseRecipeId", () => {
  it.each([
    ["1", 1],
    ["42", 42],
    ["999999", 999999],
  ])("%s → %s", (raw, id) => {
    expect(parseRecipeId(raw)).toBe(id);
  });

  it.each(["abc", "0", "-1", "1.5", "01", " 1", "1e3", "", "99999999999999999"])(
    "%j er ugyldig",
    (raw) => {
      expect(parseRecipeId(raw)).toBeNull();
    },
  );
});
