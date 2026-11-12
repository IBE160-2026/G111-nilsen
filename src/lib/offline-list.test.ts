// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearOfflineList,
  OFFLINE_LIST_EVENT,
  OFFLINE_LIST_KEY,
  parseOfflineList,
  readOfflineListRaw,
  withChecked,
  writeOfflineList,
  type OfflineList,
} from "./offline-list";

const list: OfflineList = {
  version: 1,
  title: "Uke 46",
  savedAt: "2026-11-12T10:00:00.000Z",
  items: [
    { key: "melk|dl", text: "6 dl melk", from: "Pannekaker" },
    { key: "egg|", text: "3 egg", from: "Pannekaker" },
  ],
  checked: ["egg|"],
};

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("parseOfflineList", () => {
  it("leser en gyldig liste", () => {
    expect(parseOfflineList(JSON.stringify(list))).toEqual(list);
  });

  it("gir null for tom, ugyldig eller feil formet tekst", () => {
    const bad = [
      null,
      "",
      "ikke json",
      "null",
      "[]",
      JSON.stringify({ ...list, version: 2 }),
      JSON.stringify({ ...list, title: 5 }),
      JSON.stringify({ ...list, items: "x" }),
      JSON.stringify({ ...list, items: [{ key: "a", text: 1, from: "" }] }),
      JSON.stringify({ ...list, items: [null] }),
      JSON.stringify({ ...list, checked: [1] }),
      JSON.stringify({ ...list, items: Array(501).fill(list.items[0]) }),
    ];
    for (const raw of bad) expect(parseOfflineList(raw), String(raw)).toBeNull();
  });
});

describe("writeOfflineList / clearOfflineList", () => {
  it("lagrer, leser tilbake og sier fra om endringen", () => {
    const listener = vi.fn();
    window.addEventListener(OFFLINE_LIST_EVENT, listener);
    writeOfflineList(list);
    expect(parseOfflineList(readOfflineListRaw())).toEqual(list);
    expect(listener).toHaveBeenCalledTimes(1);
    clearOfflineList();
    expect(window.localStorage.getItem(OFFLINE_LIST_KEY)).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
    clearOfflineList(); // ingenting å slette, ingen ny beskjed
    expect(listener).toHaveBeenCalledTimes(2);
    window.removeEventListener(OFFLINE_LIST_EVENT, listener);
  });

  it("en liste uten varer sletter utdraget", () => {
    writeOfflineList(list);
    writeOfflineList({ ...list, items: [], checked: [] });
    expect(window.localStorage.getItem(OFFLINE_LIST_KEY)).toBeNull();
  });

  it("tåler at lagringen feiler", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("full");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("sperret");
    });
    expect(() => writeOfflineList(list)).not.toThrow();
    expect(() => clearOfflineList()).not.toThrow();
    expect(readOfflineListRaw()).toBeNull();
  });
});

describe("withChecked", () => {
  it("krysser av og fjerner avkrysning uten å endre originalen", () => {
    const on = withChecked(list, "melk|dl", true);
    expect(on.checked).toEqual(["egg|", "melk|dl"]);
    expect(withChecked(on, "egg|", false).checked).toEqual(["melk|dl"]);
    expect(withChecked(on, "melk|dl", true).checked).toEqual(["egg|", "melk|dl"]);
    expect(list.checked).toEqual(["egg|"]);
  });
});
