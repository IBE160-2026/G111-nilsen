import { describe, expect, it } from "vitest";
import { formatLine, formatQuantity } from "./format-quantity";
import { parseLine } from "./parse-line";

describe("formatQuantity", () => {
  it.each([
    [1, "1"],
    [600, "600"],
    [0.5, "½"],
    [0.25, "¼"],
    [0.75, "¾"],
    [1 / 3, "⅓"],
    [2 / 3, "⅔"],
    [1.25, "1 ¼"],
    [2.5, "2 ½"],
  ])("%s vises som %s", (value, expected) => {
    expect(formatQuantity({ min: value })).toBe(expected);
  });

  it("bruker brøk innen 5 % av kandidaten", () => {
    expect(formatQuantity({ min: 0.49 })).toBe("½");
    expect(formatQuantity({ min: 0.97 })).toBe("1");
  });

  it("bruker én desimal med komma når ingen brøk passer", () => {
    expect(formatQuantity({ min: 1.125 })).toBe("1,1");
    expect(formatQuantity({ min: 0.6 })).toBe("0,6");
    expect(formatQuantity({ min: 0.4 })).toBe("0,4");
    // 2,8 ligger innen 5 % av 2 ¾ (kandidatens verdi teller, også heltallet).
    expect(formatQuantity({ min: 2.8 })).toBe("2 ¾");
  });

  it("viser aldri «,0»", () => {
    expect(formatQuantity({ min: 4.04 })).toBe("4");
    expect(formatQuantity({ min: 10.02 })).toBe("10");
  });

  it("viser område med tankestrek uten mellomrom", () => {
    expect(formatQuantity({ min: 4, max: 6 })).toBe("4–6");
    expect(formatQuantity({ min: 1, max: 1.5 })).toBe("1–1 ½");
  });
});

describe("formatLine", () => {
  it("setter sammen mengde, enhet og navn med ett mellomrom", () => {
    expect(formatLine({ ...parseLine("400  g   mel"), approximate: false })).toBe("400 g mel");
  });

  it("utelater enhet når linjen ikke har en", () => {
    expect(formatLine({ ...parseLine("2 løk"), approximate: false })).toBe("2 løk");
  });

  it("utelater navn når linjen bare har mengde og enhet", () => {
    expect(formatLine({ ...parseLine("2 ss"), approximate: false })).toBe("2 ss");
  });

  it("legger til « (ca.)» når mengden er avrundet", () => {
    expect(formatLine({ ...parseLine("1 egg"), approximate: true })).toBe("1 egg (ca.)");
  });

  it("viser originalen for ikke tolkbare linjer", () => {
    expect(formatLine({ ...parseLine("en klype salt"), approximate: false })).toBe("en klype salt");
  });
});
