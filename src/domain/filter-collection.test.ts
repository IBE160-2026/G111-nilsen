import { describe, expect, it } from "vitest";
import {
  buildSearchText,
  filterCollection,
  normalizeSearch,
  type CollectionEntry,
} from "./filter-collection";

function entry(
  id: number,
  title: string,
  extra: Partial<CollectionEntry> = {},
  ingredients: string[] = [],
): CollectionEntry {
  const folderName = extra.folderName ?? null;
  return {
    id,
    title,
    sourceName: null,
    sourceUrl: null,
    savedAt: "2026-11-10T10:00:00.000Z",
    isFavorite: false,
    folderName,
    searchText: buildSearchText([title, folderName, ...ingredients]),
    ...extra,
  };
}

const all = [
  entry(1, "Pannekaker", { isFavorite: true, folderName: "Frokost" }, ["mel", "melk", "egg"]),
  entry(2, "Blåbærsuppe", { folderName: "Dessert" }, ["blåbær", "sukker"]),
  entry(3, "Kjøttboller", {}, ["kjøttdeig", "melk"]),
];
const none = { query: "", onlyFavorites: false, folder: null };
const ids = (list: readonly CollectionEntry[]) => list.map((e) => e.id);

describe("normalizeSearch", () => {
  it("gjør små bokstaver, samler mellomrom og beholder æøå", () => {
    expect(normalizeSearch("  BLÅBÆR \n  Suppe ")).toBe("blåbær suppe");
  });
  it("likestiller sammensatt og oppdelt å (NFC)", () => {
    expect(normalizeSearch("å")).toBe(normalizeSearch("å"));
  });
});

describe("filterCollection", () => {
  it("tomt søk og ingen filtre gir alle, i samme rekkefølge", () => {
    expect(ids(filterCollection(all, none))).toEqual([1, 2, 3]);
    expect(ids(filterCollection(all, { ...none, query: "   " }))).toEqual([1, 2, 3]);
  });

  it("søker i tittel og ingrediens, uten hensyn til store bokstaver", () => {
    expect(ids(filterCollection(all, { ...none, query: "PANNEKAKE" }))).toEqual([1]);
    expect(ids(filterCollection(all, { ...none, query: " melk " }))).toEqual([1, 3]);
  });

  it("alle ord må treffe", () => {
    expect(ids(filterCollection(all, { ...none, query: "melk kjøtt" }))).toEqual([3]);
    expect(ids(filterCollection(all, { ...none, query: "melk sukker" }))).toEqual([]);
  });

  it("søker i mappenavn", () => {
    expect(ids(filterCollection(all, { ...none, query: "dessert" }))).toEqual([2]);
  });

  it("skiller å fra a", () => {
    expect(ids(filterCollection(all, { ...none, query: "blabær" }))).toEqual([]);
    expect(ids(filterCollection(all, { ...none, query: "blåbær" }))).toEqual([2]);
  });

  it("filtrerer på favoritt og mappe, og kombinerer med søk", () => {
    expect(ids(filterCollection(all, { ...none, onlyFavorites: true }))).toEqual([1]);
    expect(ids(filterCollection(all, { ...none, folder: "Dessert" }))).toEqual([2]);
    expect(
      ids(filterCollection(all, { query: "melk", onlyFavorites: true, folder: "Dessert" })),
    ).toEqual([]);
    expect(
      ids(filterCollection(all, { query: "melk", onlyFavorites: true, folder: "Frokost" })),
    ).toEqual([1]);
  });

  it("endrer ikke inndata", () => {
    const copy = [...all];
    filterCollection(all, { ...none, query: "melk" });
    expect(all).toEqual(copy);
  });
});
