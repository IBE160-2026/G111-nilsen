import { describe, expect, it } from "vitest";
import {
  addDays,
  formatDay,
  formatWeek,
  isIsoDate,
  isoWeekNumber,
  mondayOf,
  weekDays,
} from "./week";

describe("isIsoDate", () => {
  it("godtar gyldige datoer, også 29. februar i skuddår", () => {
    for (const value of ["2026-11-09", "2024-02-29", "2000-02-29", "1900-01-01", "2999-12-31"])
      expect(isIsoDate(value)).toBe(true);
  });

  it("avviser ugyldige datoer, feil format og annet enn tekst", () => {
    for (const value of [
      "2026-02-29",
      "1900-02-29",
      "2026-13-01",
      "2026-11-31",
      "2026-1-9",
      "09.11.2026",
      "2026-11-09T00:00",
      " 2026-11-09",
      "1899-12-31",
      "3000-01-01",
      "",
      20261109,
      null,
      undefined,
      ["2026-11-09"],
    ])
      expect(isIsoDate(value)).toBe(false);
  });
});

describe("addDays og mondayOf", () => {
  it("regner over måneds- og årsskifte", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
  });

  it("finner mandagen i uka, med søndag som siste dag", () => {
    expect(mondayOf("2026-11-09")).toBe("2026-11-09"); // mandag
    expect(mondayOf("2026-11-12")).toBe("2026-11-09"); // torsdag
    expect(mondayOf("2026-11-15")).toBe("2026-11-09"); // søndag
    expect(mondayOf("2026-11-16")).toBe("2026-11-16");
    expect(mondayOf("2027-01-01")).toBe("2026-12-28");
  });

  it("gir sju dager fra mandag til søndag", () => {
    expect(weekDays("2026-11-09")).toEqual([
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
      "2026-11-15",
    ]);
  });
});

describe("isoWeekNumber", () => {
  it("følger ISO 8601 (uka med årets første torsdag er uke 1)", () => {
    expect(isoWeekNumber("2026-11-09")).toBe(46);
    expect(isoWeekNumber("2026-01-01")).toBe(1);
    expect(isoWeekNumber("2027-01-01")).toBe(53); // fredag i uke 53 av 2026
    expect(isoWeekNumber("2024-12-30")).toBe(1); // mandag i uke 1 av 2025
    expect(isoWeekNumber("2021-01-03")).toBe(53);
  });
});

describe("formatDay og formatWeek", () => {
  it("skriver dagen på norsk", () => {
    expect(formatDay("2026-11-09")).toBe("mandag 9. november");
    expect(formatDay("2026-11-15")).toBe("søndag 15. november");
  });

  it("skriver uka med nummer og datoer, også over måneds- og årsskifte", () => {
    expect(formatWeek("2026-11-09")).toBe("Uke 46 · 9.–15. november 2026");
    expect(formatWeek("2026-11-30")).toBe("Uke 49 · 30. november–6. desember 2026");
    expect(formatWeek("2026-12-28")).toBe("Uke 53 · 28. desember–3. januar 2027");
  });
});
