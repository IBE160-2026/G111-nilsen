import { describe, expect, it } from "vitest";
import { sourceLabel } from "./source-label";

describe("sourceLabel", () => {
  it.each([
    [{ sourceName: "Matprat", sourceUrl: "https://www.matprat.no/x" }, "Matprat"],
    [{ sourceName: null, sourceUrl: "https://www.matprat.no/x" }, "matprat.no"],
    [{ sourceName: "  ", sourceUrl: "https://example.com/a" }, "example.com"],
    [{ sourceName: null, sourceUrl: "ikke en lenke" }, "Lagt inn selv"],
    [{ sourceName: null, sourceUrl: null }, "Lagt inn selv"],
  ])("sourceLabel(%j) = %s", (source, expected) => {
    expect(sourceLabel(source)).toBe(expected);
  });
});
