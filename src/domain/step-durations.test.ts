import { describe, expect, it } from "vitest";
import { findStepDurations, formatCountdown, formatTimerLabel } from "./step-durations";

const seconds = (text: string) => findStepDurations(text).map((d) => d.seconds);

describe("findStepDurations", () => {
  it("finner minutter, timer og sekunder", () => {
    expect(seconds("Stek i 10 minutter.")).toEqual([600]);
    expect(seconds("La den hvile i 20 min.")).toEqual([1200]);
    expect(seconds("Kok i 2 timer.")).toEqual([7200]);
    expect(seconds("Varm i 1 time")).toEqual([3600]);
    expect(seconds("Rør i 30 sekunder")).toEqual([30]);
    expect(seconds("Visp i 45 sek.")).toEqual([45]);
    expect(seconds("Hev i 1 t")).toEqual([3600]);
  });

  it("bruker den korteste tiden i et spenn, med alle skrivemåter av skilletegnet", () => {
    expect(seconds("Stek i 10–15 minutter")).toEqual([600]);
    expect(seconds("Stek i 10-15 min")).toEqual([600]);
    expect(seconds("Stek i 10 — 15 min")).toEqual([600]);
    expect(seconds("Stek i 10 til 15 minutter")).toEqual([600]);
    expect(seconds("Hev i 1–2 timer")).toEqual([3600]);
    expect(findStepDurations("Stek i 10–15 minutter")[0].text).toBe("10–15 minutter");
  });

  it("regner desimaler med komma og punktum", () => {
    expect(seconds("Kok i 1,5 time")).toEqual([5400]);
    expect(seconds("Kok i 1.5 timer")).toEqual([5400]);
    expect(seconds("Stek i 2,5 minutter")).toEqual([150]);
  });

  it("slår sammen timer og minutter", () => {
    expect(seconds("Småkok i 1 time og 30 minutter.")).toEqual([5400]);
    expect(seconds("Stek i 1 t 15 min")).toEqual([4500]);
    expect(seconds("Stek i 2 timer 5 min")).toEqual([7500]);
    expect(findStepDurations("Småkok i 1 time og 30 minutter.")[0].text).toBe(
      "1 time og 30 minutter",
    );
  });

  it("forstår «en halv time» og «et kvarter»", () => {
    expect(seconds("La stå i en halv time.")).toEqual([1800]);
    expect(seconds("Stek i et kvarter.")).toEqual([900]);
    expect(seconds("EN HALV TIME")).toEqual([1800]);
  });

  it("gir flere tider i den rekkefølgen de står, og én for samme lengde", () => {
    expect(seconds("Stek 5 minutter, snu og stek 3 minutter til.")).toEqual([300, 180]);
    expect(seconds("Stek 5 minutter på hver side, 5 min totalt.")).toEqual([300]);
  });

  it("hopper over ord som bare ligner, og tall uten tidsenhet", () => {
    expect(seconds("Bruk minst 3 egg og et timeglass.")).toEqual([]);
    expect(seconds("Tilsett 10 mintblader")).toEqual([]);
    expect(seconds("Ha i 2 ts salt og 3 dl melk")).toEqual([]);
    expect(seconds("Stek i en liten stund")).toEqual([]);
    expect(seconds("")).toEqual([]);
  });

  it("hopper over tider som ikke gir en brukbar tidtaker", () => {
    expect(seconds("Hvil i 0 minutter")).toEqual([]);
    expect(seconds("La stå i 25 timer")).toEqual([]);
    expect(seconds("La stå i 24 timer")).toEqual([86400]);
  });

  it("tar ikke tall som er en del av et versjonsnummer", () => {
    expect(seconds("Stek ved 200 grader i 15 min")).toEqual([900]);
    expect(seconds("Versjon 1.2.5 min")).toEqual([]);
  });
});

describe("formatTimerLabel", () => {
  it("skriver tiden kort", () => {
    expect(formatTimerLabel(30)).toBe("30 sek");
    expect(formatTimerLabel(600)).toBe("10 min");
    expect(formatTimerLabel(150)).toBe("2 min 30 sek");
    expect(formatTimerLabel(3600)).toBe("1 t");
    expect(formatTimerLabel(5400)).toBe("1 t 30 min");
    expect(formatTimerLabel(0)).toBe("0 sek");
  });
});

describe("formatCountdown", () => {
  it("viser minutter og sekunder, og timer fra én time", () => {
    expect(formatCountdown(545)).toBe("9:05");
    expect(formatCountdown(60)).toBe("1:00");
    expect(formatCountdown(5)).toBe("0:05");
    expect(formatCountdown(5400)).toBe("1:30:00");
    expect(formatCountdown(3599.2)).toBe("1:00:00");
    expect(formatCountdown(-3)).toBe("0:00");
  });
});
