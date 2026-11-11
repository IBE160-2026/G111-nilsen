import { describe, expect, it } from "vitest";
import {
  buildSearchText,
  filterCollection,
  normalizeSearch,
  sortCollection,
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

describe("merkelapper (Story 6.7)", () => {
  const withLabels = (title: string, labels: string[]) => ({
    id: 1,
    title,
    sourceName: null,
    sourceUrl: null,
    savedAt: "2026-11-10T10:00:00.000Z",
    isFavorite: false,
    folderName: null,
    totalMinutes: null,
    labels,
    searchText: buildSearchText([title, ...labels]),
  });
  const list = [
    withLabels("Taco", ["Hverdag", "Vegetar"]),
    withLabels("Lapskaus", ["Helg"]),
    withLabels("Suppe", []),
  ];

  it("søket finner merkelapper", () => {
    expect(
      filterCollection(list, { query: "vegetar", onlyFavorites: false, folder: null }).map(
        (e) => e.title,
      ),
    ).toEqual(["Taco"]);
  });

  it("filteret velger oppskrifter med merkelappen, uavhengig av store og små bokstaver", () => {
    const titles = (label: string | null | undefined) =>
      filterCollection(list, { query: "", onlyFavorites: false, folder: null, label }).map(
        (e) => e.title,
      );
    expect(titles("HVERDAG")).toEqual(["Taco"]);
    expect(titles("Helg")).toEqual(["Lapskaus"]);
    expect(titles("finnes ikke")).toEqual([]);
    expect(titles(null)).toEqual(["Taco", "Lapskaus", "Suppe"]);
    expect(titles(undefined)).toHaveLength(3);
  });
});

describe("sortCollection (Story 6.9)", () => {
  const e = (
    id: number,
    title: string,
    extra: { lastCookedAt?: string | null; cookedCount?: number; rating?: number | null } = {},
  ) => ({
    id,
    title,
    sourceName: null,
    sourceUrl: null,
    savedAt: "2026-11-10T10:00:00.000Z",
    isFavorite: false,
    folderName: null,
    totalMinutes: null,
    ...extra,
  });
  // Listen kommer «sist lagret først», slik den gjør fra serveren.
  const list = [
    e(4, "Østers", { lastCookedAt: null, cookedCount: 0, rating: null }),
    e(3, "Ananas", { lastCookedAt: "2026-11-05T10:00:00.000Z", cookedCount: 2, rating: 3 }),
    e(2, "Brød", { lastCookedAt: "2026-11-09T10:00:00.000Z", cookedCount: 2, rating: 5 }),
    e(1, "Zebra"),
  ];
  const ids = (sort: Parameters<typeof sortCollection>[1]) =>
    sortCollection(list, sort).map((x) => x.id);

  it("sist lagret beholder rekkefølgen, uten å endre listen som kom inn", () => {
    const before = list.map((x) => x.id);
    expect(ids("saved")).toEqual([4, 3, 2, 1]);
    ids("alpha");
    expect(list.map((x) => x.id)).toEqual(before);
  });

  it("sist laget: nyeste først, aldri laget sist i rekkefølgen sist lagret", () => {
    expect(ids("cooked")).toEqual([2, 3, 4, 1]);
  });

  it("mest laget: flest først, likt antall i rekkefølgen sist lagret, utelatt teller som 0", () => {
    expect(ids("mostCooked")).toEqual([3, 2, 4, 1]);
  });

  it("høyest vurdering: høyest først, uvurdert sist", () => {
    expect(ids("rating")).toEqual([2, 3, 4, 1]);
  });

  it("alfabetisk følger norsk rekkefølge (Æ, Ø og Å til slutt)", () => {
    expect(ids("alpha")).toEqual([3, 2, 1, 4]);
    const nb = sortCollection([e(1, "Åre"), e(2, "Ære"), e(3, "Ost"), e(4, "ost")], "alpha");
    expect(nb.map((x) => x.title)).toEqual(["Ost", "ost", "Ære", "Åre"]);
  });
});
