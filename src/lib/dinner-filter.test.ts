import { describe, expect, it } from "vitest";
import { DEFAULT_DINNER_FILTER, parseDinnerFilter } from "./dinner-filter";

describe("parseDinnerFilter", () => {
  it("uten lagret verdi eller med ugyldig innhold gis standardvalget", () => {
    expect(parseDinnerFilter(null)).toBe(DEFAULT_DINNER_FILTER);
    expect(parseDinnerFilter("{ikke json")).toBe(DEFAULT_DINNER_FILTER);
    expect(parseDinnerFilter("42")).toBe(DEFAULT_DINNER_FILTER);
    expect(parseDinnerFilter("null")).toBe(DEFAULT_DINNER_FILTER);
  });

  it("leser et gyldig valg, inkludert «Uten mappe» som null", () => {
    expect(
      parseDinnerFilter(
        JSON.stringify({ onlyFavorites: true, maxMinutes: 30, folders: ["Hverdag", null] }),
      ),
    ).toEqual({ onlyFavorites: true, maxMinutes: 30, folders: ["Hverdag", null] });
  });

  it("forkaster felt med feil type", () => {
    expect(
      parseDinnerFilter(
        JSON.stringify({ onlyFavorites: "ja", maxMinutes: -5, folders: ["A", 3, {}] }),
      ),
    ).toEqual({ onlyFavorites: false, maxMinutes: null, folders: ["A"] });
    expect(parseDinnerFilter(JSON.stringify({ maxMinutes: 1.5, folders: "A" }))).toEqual(
      DEFAULT_DINNER_FILTER,
    );
  });
});
