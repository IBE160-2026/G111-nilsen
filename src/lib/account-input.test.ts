import { describe, expect, it } from "vitest";
import { isValidEmail, normalizeEmail, safeNextPath } from "./account-input";

describe("normalizeEmail og isValidEmail", () => {
  it("trimmer og gjør om til små bokstaver", () => {
    expect(normalizeEmail("  Maja@Eksempel.NO ")).toBe("maja@eksempel.no");
  });

  it.each(["maja@eksempel.no", "a.b+c@d.co"])("%s er gyldig", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each(["", "maja", "maja@", "@eksempel.no", "maja@eksempel", "ma ja@eksempel.no"])(
    "%j er ugyldig",
    (email) => {
      expect(isValidEmail(email)).toBe(false);
    },
  );

  it("avviser for lange adresser", () => {
    expect(isValidEmail(`${"a".repeat(250)}@b.no`)).toBe(false);
  });
});

describe("safeNextPath", () => {
  it.each([
    ["/oppskrifter", "/oppskrifter"],
    ["/oppskrift/4?x=1", "/oppskrift/4?x=1"],
    ["//evil.no", "/"],
    ["/\\evil.no", "/"],
    ["https://evil.no", "/"],
    ["oppskrifter", "/"],
    ["/a\nb", "/"],
    [undefined, "/"],
    [["/a", "/b"], "/"],
  ])("%j gir %j", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});
