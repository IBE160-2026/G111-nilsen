import { describe, expect, it } from "vitest";
import { dinnerCandidates, dinnerFolders, pickDinner, type DinnerCandidate } from "./pick-dinner";

const r = (
  id: number,
  minutes: number | null,
  fav = false,
  folderName: string | null = null,
): DinnerCandidate => ({
  id,
  title: `R${id}`,
  totalMinutes: minutes,
  isFavorite: fav,
  folderName,
});
const all = [
  r(1, 20, true, "Hverdag"),
  r(2, 45, false, "Helg"),
  r(3, null, true, "Hverdag"),
  r(4, 90),
];

describe("dinnerCandidates", () => {
  it("gir alle uten filter", () => {
    expect(dinnerCandidates(all, { onlyFavorites: false, maxMinutes: null })).toHaveLength(4);
  });
  it("filtrerer på favoritter", () => {
    expect(
      dinnerCandidates(all, { onlyFavorites: true, maxMinutes: null }).map((x) => x.id),
    ).toEqual([1, 3]);
  });
  it("filtrerer på tid og hopper over oppskrifter uten tid", () => {
    expect(
      dinnerCandidates(all, { onlyFavorites: false, maxMinutes: 60 }).map((x) => x.id),
    ).toEqual([1, 2]);
  });
  it("trekker bare fra valgte mapper, og «uten mappe» er null", () => {
    expect(
      dinnerCandidates(all, { onlyFavorites: false, maxMinutes: null, folders: ["Hverdag"] }).map(
        (x) => x.id,
      ),
    ).toEqual([1, 3]);
    expect(
      dinnerCandidates(all, {
        onlyFavorites: false,
        maxMinutes: null,
        folders: ["Helg", null],
      }).map((x) => x.id),
    ).toEqual([2, 4]);
    // Tom liste betyr alle mapper.
    expect(
      dinnerCandidates(all, { onlyFavorites: false, maxMinutes: null, folders: [] }),
    ).toHaveLength(4);
  });

  it("kombinerer filtrene", () => {
    expect(dinnerCandidates(all, { onlyFavorites: true, maxMinutes: 30 }).map((x) => x.id)).toEqual(
      [1],
    );
  });
});

describe("dinnerFolders", () => {
  it("gir mappene sortert på norsk, med «uten mappe» (null) sist og uten dubletter", () => {
    expect(dinnerFolders(all)).toEqual(["Helg", "Hverdag", null]);
    expect(dinnerFolders([r(9, 10, false, "Åsted"), r(10, 10, false, "Barnemat")])).toEqual([
      "Barnemat",
      "Åsted",
    ]);
    expect(dinnerFolders([r(11, 10, false, "Helg")])).toEqual(["Helg"]);
  });
});

describe("pickDinner", () => {
  it("gir null uten kandidater", () => {
    expect(pickDinner([], null)).toBeNull();
  });
  it("velger ut fra tilfeldig tall, også ved tallet 1 eller mer", () => {
    expect(pickDinner(all, null, () => 0)?.id).toBe(1);
    expect(pickDinner(all, null, () => 0.99)?.id).toBe(4);
    expect(pickDinner(all, null, () => 1)?.id).toBe(4);
  });
  it("hopper over forrige når det finnes flere", () => {
    for (const x of [0, 0.3, 0.6, 0.99]) {
      expect(pickDinner(all, 1, () => x)?.id).not.toBe(1);
    }
  });
  it("gir den eneste selv om den var forrige", () => {
    expect(pickDinner([r(7, 10)], 7)?.id).toBe(7);
  });
});
