import { describe, expect, it } from "vitest";
import {
  cleanFolderName,
  FOLDER_NAME_MAX_LENGTH,
  folderNameKey,
  folderNameLength,
} from "./folder-name";

describe("cleanFolderName", () => {
  it.each([
    ["Hverdag", "Hverdag"],
    ["  Hverdag  ", "Hverdag"],
    ["  Ny   helg  ", "Ny helg"],
    ["Ny\t\nhelg", "Ny helg"],
    ["Ny  helg", "Ny helg"],
    ["", ""],
    ["   ", ""],
    ["\u200B", ""],
    ["\u200B\u2060\uFEFF", ""],
    ["\u180E", ""],
    ["\u200D", ""],
    ["\u200Bx", "x"],
    ["Hver\u200Bdag", "Hverdag"],
    ["Ny\u00A0 helg", "Ny helg"],
    ["Cafe\u0301", "Café"],
  ])("%j gir %j", (raw, expected) => {
    expect(cleanFolderName(raw)).toBe(expected);
  });

  it("gir samme navn og lengde for sammensatt og dekomponert tegn", () => {
    expect(cleanFolderName("Cafe\u0301")).toBe(cleanFolderName("Caf\u00E9"));
    expect(folderNameLength(cleanFolderName("e\u0301".repeat(40)))).toBe(40);
  });
});

describe("folderNameLength", () => {
  it("teller Unicode-tegn, ikke UTF-16-enheter", () => {
    expect(FOLDER_NAME_MAX_LENGTH).toBe(40);
    expect(folderNameLength("æøå")).toBe(3);
    expect(folderNameLength("🍝")).toBe(1);
    expect("🍝".length).toBe(2);
    expect(folderNameLength("🍝".repeat(40))).toBe(40);
    expect(folderNameLength("🍝".repeat(41))).toBe(41);
  });
});

describe("folderNameKey", () => {
  it.each([
    ["Hverdag", "hverdag"],
    ["HVERDAG", "hverdag"],
    ["ÆRLIG", "ærlig"],
    ["Ærlig", "ærlig"],
    ["ØL OG ÅRSTID", "øl og årstid"],
  ])("%j gir %j (norske store og små bokstaver)", (name, key) => {
    expect(folderNameKey(name)).toBe(key);
  });

  it("er NFC-normalisert: «å» som a + ring er samme nøkkel som «å»", () => {
    const decomposed = "å";
    expect(decomposed).not.toBe("å");
    expect(folderNameKey(decomposed)).toBe(folderNameKey("å"));
    expect(folderNameKey(`${decomposed}RSTID`)).toBe("årstid");
  });
});
