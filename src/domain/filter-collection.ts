import type { RecipeSummary } from "./types";

/** En oppskrift i Samlingen med ferdig normalisert søketekst (Story 5.2). */
export type CollectionEntry = RecipeSummary & { searchText: string };

export type CollectionFilter = {
  /** Søkeord adskilt med mellomrom; alle må finnes. Tom tekst gir alle. */
  query: string;
  onlyFavorites: boolean;
  /** Mappenavn, eller `null` for alle mapper. */
  folder: string | null;
  /** Merkelapp (Story 6.7), eller utelatt/`null` for alle. */
  label?: string | null;
};

/** NFC, små bokstaver og enkle mellomrom. Æ, ø og å beholdes som egne bokstaver. */
export function normalizeSearch(text: string): string {
  return text.normalize("NFC").toLocaleLowerCase("nb").replace(/\s+/g, " ").trim();
}

export const COLLECTION_SORTS = ["saved", "cooked", "mostCooked", "rating", "alpha"] as const;
export type CollectionSort = (typeof COLLECTION_SORTS)[number];

/**
 * Sorterer Samlingen (Story 6.9) uten å endre listen som kom inn. `saved` er sist lagret først
 * (som fra serveren), `cooked` sist laget først (aldri laget sist), `mostCooked` flest ganger
 * laget først, `rating` høyest vurdering først (uvurdert sist) og `alpha` alfabetisk (norsk).
 * Like verdier beholder rekkefølgen de kom i, så sist lagret er alltid andrevalget.
 */
export function sortCollection<T extends RecipeSummary>(
  entries: readonly T[],
  sort: CollectionSort,
): T[] {
  const copy = [...entries];
  if (sort === "saved") return copy;
  const compare: Record<Exclude<CollectionSort, "saved">, (a: T, b: T) => number> = {
    cooked: (a, b) => (b.lastCookedAt ?? "").localeCompare(a.lastCookedAt ?? ""),
    mostCooked: (a, b) => (b.cookedCount ?? 0) - (a.cookedCount ?? 0),
    rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    alpha: (a, b) => a.title.localeCompare(b.title, "nb", { sensitivity: "base" }),
  };
  // Array.prototype.sort er stabil, så like verdier beholder rekkefølgen «sist lagret».
  return copy.sort(compare[sort]);
}

/** Søketeksten for en oppskrift: tittel, kilde, mappe, merkelapper og ingrediensnavn. */
export function buildSearchText(parts: readonly (string | null)[]): string {
  return normalizeSearch(parts.filter((part): part is string => part !== null).join(" "));
}

/** Filtrerer Samlingen i den rekkefølgen den kommer i. Ren funksjon, ingen sortering. */
export function filterCollection<T extends CollectionEntry>(
  entries: readonly T[],
  filter: CollectionFilter,
): T[] {
  const labelKey = filter.label == null ? null : normalizeSearch(filter.label);
  const words = normalizeSearch(filter.query).split(" ").filter(Boolean);
  return entries.filter(
    (entry) =>
      (!filter.onlyFavorites || entry.isFavorite) &&
      (filter.folder === null || entry.folderName === filter.folder) &&
      (labelKey === null ||
        (entry.labels ?? []).some((label) => normalizeSearch(label) === labelKey)) &&
      words.every((word) => entry.searchText.includes(word)),
  );
}
