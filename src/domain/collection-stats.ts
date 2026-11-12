/**
 * Tall om samlingen (Story 6.20b): hva som er laget mest, hva som aldri er laget, hvordan
 * oppskriftene fordeler seg på mapper, merkelapper og kilder. Rene funksjoner uten database, så
 * alle reglene kan testes direkte.
 */

/** En oppskrift slik statistikken trenger den. `source` er ferdig vist navn på kilden. */
export type StatsRecipe = {
  id: number;
  title: string;
  source: string;
  folderName: string | null;
  isFavorite: boolean;
  cookedCount?: number;
  lastCookedAt?: string | null;
  rating?: number | null;
  totalMinutes?: number | null;
  labels?: readonly string[];
};

/** En oppskrift i en topplise, med tallet den er rangert på. */
export type RankedRecipe = { id: number; title: string; value: number; date?: string | null };

/** Et navn med antall, for mapper, merkelapper og kilder. */
export type NameCount = { name: string; count: number };

export type CollectionStats = {
  total: number;
  /** Hvor mange ganger det er krysset av «Laget i dag», til sammen. */
  cookedTotal: number;
  cookedRecipes: number;
  neverCooked: number;
  favorites: number;
  rated: number;
  /** Snitt av vurderingene, én desimal, eller `null` når ingen er vurdert. */
  averageRating: number | null;
  /** Snitt av tidene, hele minutter, eller `null` når ingen har tid. */
  averageMinutes: number | null;
  mostCooked: RankedRecipe[];
  recentlyCooked: RankedRecipe[];
  topRated: RankedRecipe[];
  folders: NameCount[];
  labels: NameCount[];
  sources: NameCount[];
  plannedMeals: number;
  mostPlanned: NameCount[];
};

/** Hvor mange rader topplistene viser. */
export const TOP_LIST_SIZE = 5;

const byTitle = (a: string, b: string) => a.localeCompare(b, "nb");

/** Teller like navn og sorterer på antall, så navn. */
function countByName(names: readonly string[], limit?: number): NameCount[] {
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  const sorted = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || byTitle(a.name, b.name));
  return limit === undefined ? sorted : sorted.slice(0, limit);
}

function average(values: readonly number[], decimals: number): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((total, value) => total + value, 0);
  const factor = 10 ** decimals;
  return Math.round((sum / values.length) * factor) / factor;
}

/**
 * Regner ut statistikken for en samling. `plannedTitles` er titlene fra ukemenyen (én per
 * planlagt måltid). `noFolderName` er teksten som brukes for oppskrifter uten mappe.
 */
export function collectionStats(
  recipes: readonly StatsRecipe[],
  plannedTitles: readonly string[] = [],
  noFolderName = "Uten mappe",
): CollectionStats {
  const cooked = recipes.filter((recipe) => (recipe.cookedCount ?? 0) > 0);
  const rated = recipes.filter((recipe) => recipe.rating != null);

  return {
    total: recipes.length,
    cookedTotal: recipes.reduce((sum, recipe) => sum + (recipe.cookedCount ?? 0), 0),
    cookedRecipes: cooked.length,
    neverCooked: recipes.length - cooked.length,
    favorites: recipes.filter((recipe) => recipe.isFavorite).length,
    rated: rated.length,
    averageRating: average(
      rated.map((recipe) => recipe.rating ?? 0),
      1,
    ),
    averageMinutes: average(
      recipes.filter((r) => r.totalMinutes != null).map((r) => r.totalMinutes ?? 0),
      0,
    ),
    mostCooked: [...cooked]
      .sort((a, b) => (b.cookedCount ?? 0) - (a.cookedCount ?? 0) || byTitle(a.title, b.title))
      .slice(0, TOP_LIST_SIZE)
      .map((recipe) => ({
        id: recipe.id,
        title: recipe.title,
        value: recipe.cookedCount ?? 0,
        date: recipe.lastCookedAt ?? null,
      })),
    recentlyCooked: recipes
      .filter((recipe) => recipe.lastCookedAt != null)
      .sort((a, b) => (b.lastCookedAt ?? "").localeCompare(a.lastCookedAt ?? ""))
      .slice(0, TOP_LIST_SIZE)
      .map((recipe) => ({
        id: recipe.id,
        title: recipe.title,
        value: recipe.cookedCount ?? 0,
        date: recipe.lastCookedAt ?? null,
      })),
    topRated: [...rated]
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || byTitle(a.title, b.title))
      .slice(0, TOP_LIST_SIZE)
      .map((recipe) => ({ id: recipe.id, title: recipe.title, value: recipe.rating ?? 0 })),
    folders: countByName(recipes.map((recipe) => recipe.folderName ?? noFolderName)),
    labels: countByName(
      recipes.flatMap((recipe) => [...(recipe.labels ?? [])]),
      8,
    ),
    sources: countByName(
      recipes.map((recipe) => recipe.source),
      TOP_LIST_SIZE,
    ),
    plannedMeals: plannedTitles.length,
    mostPlanned: countByName(plannedTitles, TOP_LIST_SIZE),
  };
}
