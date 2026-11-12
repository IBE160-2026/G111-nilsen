import { describe, expect, it } from "vitest";
import { collectionStats, type StatsRecipe } from "./collection-stats";

function recipe(id: number, title: string, extra: Partial<StatsRecipe> = {}): StatsRecipe {
  return {
    id,
    title,
    source: "Lagt inn selv",
    folderName: null,
    isFavorite: false,
    ...extra,
  };
}

const samling: StatsRecipe[] = [
  recipe(1, "Taco", {
    cookedCount: 6,
    lastCookedAt: "2026-11-10T17:00:00.000Z",
    rating: 5,
    isFavorite: true,
    folderName: "Hverdag",
    labels: ["Rask", "Barnevennlig"],
    totalMinutes: 30,
    source: "Godt.no",
  }),
  recipe(2, "Fiskesuppe", {
    cookedCount: 2,
    lastCookedAt: "2026-11-11T17:00:00.000Z",
    rating: 4,
    folderName: "Helg",
    labels: ["Fisk"],
    totalMinutes: 35,
    source: "Matprat",
  }),
  recipe(3, "Brød", { folderName: "Baking", totalMinutes: 85, source: "Matprat" }),
  recipe(4, "Vafler", { cookedCount: 6, lastCookedAt: "2026-01-02T12:00:00.000Z", rating: 5 }),
  recipe(5, "Pizza", { labels: ["Rask"], isFavorite: true }),
];

describe("collectionStats", () => {
  const stats = collectionStats(samling, ["Taco", "Fiskesuppe", "Taco"]);

  it("teller samlingen, laginger, favoritter og vurderinger", () => {
    expect(stats.total).toBe(5);
    expect(stats.cookedTotal).toBe(14);
    expect(stats.cookedRecipes).toBe(3);
    expect(stats.neverCooked).toBe(2);
    expect(stats.favorites).toBe(2);
    expect(stats.rated).toBe(3);
  });

  it("regner snitt av vurdering med én desimal og tid i hele minutter", () => {
    expect(stats.averageRating).toBe(4.7);
    expect(stats.averageMinutes).toBe(50);
    const uten = collectionStats([recipe(9, "A")]);
    expect(uten.averageRating).toBeNull();
    expect(uten.averageMinutes).toBeNull();
  });

  it("mest laget: flest ganger først, like mange sortert på tittel", () => {
    expect(stats.mostCooked.map((r) => [r.title, r.value])).toEqual([
      ["Taco", 6],
      ["Vafler", 6],
      ["Fiskesuppe", 2],
    ]);
  });

  it("sist laget: nyeste dato først, og bare de som er laget", () => {
    expect(stats.recentlyCooked.map((r) => r.title)).toEqual(["Fiskesuppe", "Taco", "Vafler"]);
  });

  it("best vurdert: høyest stjerne først, like sortert på tittel", () => {
    expect(stats.topRated.map((r) => [r.title, r.value])).toEqual([
      ["Taco", 5],
      ["Vafler", 5],
      ["Fiskesuppe", 4],
    ]);
  });

  it("teller mapper med «Uten mappe», merkelapper og kilder", () => {
    expect(stats.folders).toEqual([
      { name: "Uten mappe", count: 2 },
      { name: "Baking", count: 1 },
      { name: "Helg", count: 1 },
      { name: "Hverdag", count: 1 },
    ]);
    expect(stats.labels).toEqual([
      { name: "Rask", count: 2 },
      { name: "Barnevennlig", count: 1 },
      { name: "Fisk", count: 1 },
    ]);
    expect(stats.sources).toEqual([
      { name: "Lagt inn selv", count: 2 },
      { name: "Matprat", count: 2 },
      { name: "Godt.no", count: 1 },
    ]);
  });

  it("teller planlagte måltider og hva som er planlagt oftest", () => {
    expect(stats.plannedMeals).toBe(3);
    expect(stats.mostPlanned).toEqual([
      { name: "Taco", count: 2 },
      { name: "Fiskesuppe", count: 1 },
    ]);
  });

  it("topplistene er høyst fem lange", () => {
    const mange = Array.from({ length: 9 }, (_, i) =>
      recipe(i + 1, `R${i}`, { cookedCount: i + 1, lastCookedAt: `2026-01-0${i + 1}T10:00:00Z` }),
    );
    const s = collectionStats(
      mange,
      mange.map((r) => r.title),
    );
    expect(s.mostCooked).toHaveLength(5);
    expect(s.recentlyCooked).toHaveLength(5);
    expect(s.mostPlanned).toHaveLength(5);
  });

  it("en tom samling gir nuller og tomme lister", () => {
    const tom = collectionStats([]);
    expect(tom).toMatchObject({
      total: 0,
      cookedTotal: 0,
      neverCooked: 0,
      favorites: 0,
      mostCooked: [],
      folders: [],
      labels: [],
      plannedMeals: 0,
    });
  });

  it("endrer ikke listen den får inn", () => {
    const før = JSON.stringify(samling);
    collectionStats(samling);
    expect(JSON.stringify(samling)).toBe(før);
  });
});
