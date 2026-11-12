// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  HIDDEN_SHORTCUTS_KEY,
  parseHiddenShortcuts,
  readHiddenShortcutsRaw,
  writeHiddenShortcuts,
} from "./hidden-shortcuts";

afterEach(() => window.localStorage.clear());

describe("hidden-shortcuts", () => {
  it("tolker ugyldig innhold som ingen skjulte", () => {
    expect(parseHiddenShortcuts(null)).toEqual([]);
    expect(parseHiddenShortcuts("{")).toEqual([]);
    expect(parseHiddenShortcuts('{"a":1}')).toEqual([]);
    expect(parseHiddenShortcuts('["/a", 3, null, "/b"]')).toEqual(["/a", "/b"]);
  });

  it("skriver og leser, og gir beskjed i samme vindu", () => {
    let events = 0;
    window.addEventListener("recipemate-hidden-shortcuts-changed", () => events++);
    writeHiddenShortcuts(["/statistikk"]);
    expect(events).toBe(1);
    expect(parseHiddenShortcuts(readHiddenShortcutsRaw())).toEqual(["/statistikk"]);
    expect(window.localStorage.getItem(HIDDEN_SHORTCUTS_KEY)).toBe('["/statistikk"]');
  });
});
