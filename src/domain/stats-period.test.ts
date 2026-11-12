import { describe, expect, it } from "vitest";
import { parseStatsPeriod, periodStart } from "./stats-period";

describe("parseStatsPeriod", () => {
  it("kjenner de tre periodene og faller tilbake til «alt»", () => {
    expect(parseStatsPeriod("30")).toBe("30");
    expect(parseStatsPeriod("aar")).toBe("aar");
    expect(parseStatsPeriod("alt")).toBe("alt");
    expect(parseStatsPeriod(undefined)).toBe("alt");
    expect(parseStatsPeriod("7")).toBe("alt");
    expect(parseStatsPeriod(["30", "aar"])).toBe("30");
    expect(parseStatsPeriod(30)).toBe("alt");
  });
});

describe("periodStart", () => {
  const now = new Date("2026-11-12T15:00:00.000Z");
  it("«alt» har ingen start", () => {
    expect(periodStart("alt", now)).toBeNull();
  });
  it("«30» er 30 døgn tilbake", () => {
    expect(periodStart("30", now)).toBe("2026-10-13T15:00:00.000Z");
  });
  it("«aar» begynner nyttårsnatt i norsk tid", () => {
    expect(periodStart("aar", now)).toBe("2025-12-31T23:00:00.000Z");
  });
  it("nyttårsaften kl. 23:30 UTC er allerede neste år i Norge", () => {
    expect(periodStart("aar", new Date("2026-12-31T23:30:00.000Z"))).toBe(
      "2026-12-31T23:00:00.000Z",
    );
  });
});
