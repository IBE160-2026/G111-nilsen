export type DinnerCandidate = {
  id: number;
  title: string;
  totalMinutes: number | null;
  isFavorite: boolean;
  /** Mappen oppskriften ligger i, eller `null` når den ikke ligger i noen (Story 6.13b). */
  folderName: string | null;
};

export type DinnerFilter = {
  onlyFavorites: boolean;
  /** Høyeste tid i minutter, eller `null` for alle. Oppskrifter uten tid regnes ikke med når den er satt. */
  maxMinutes: number | null;
  /**
   * Mappene det trekkes fra (Story 6.13b). `null` i listen er «uten mappe». En tom liste betyr
   * alle mapper, så brukeren slipper å velge noe for å komme i gang.
   */
  folders?: readonly (string | null)[];
};

/** Mappene det faktisk finnes oppskrifter i, sortert på norsk, med «uten mappe» (null) sist. */
export function dinnerFolders(recipes: readonly DinnerCandidate[]): (string | null)[] {
  const named = [...new Set(recipes.map((r) => r.folderName).filter((n) => n !== null))].sort(
    (a, b) => a.localeCompare(b, "nb"),
  );
  return recipes.some((r) => r.folderName === null) ? [...named, null] : named;
}

/** Oppskriftene som passer filteret (Story 6.13). */
export function dinnerCandidates<T extends DinnerCandidate>(
  recipes: readonly T[],
  filter: DinnerFilter,
): T[] {
  const folders = filter.folders ?? [];
  return recipes.filter(
    (recipe) =>
      (!filter.onlyFavorites || recipe.isFavorite) &&
      (filter.maxMinutes === null ||
        (recipe.totalMinutes !== null && recipe.totalMinutes <= filter.maxMinutes)) &&
      (folders.length === 0 || folders.includes(recipe.folderName)),
  );
}

/**
 * Trekker en tilfeldig oppskrift (Story 6.13). `previousId` hoppes over så lenge det finnes en
 * annen å velge, slik at «en annen» alltid er en annen. `random` kan byttes ut i tester.
 */
export function pickDinner<T extends DinnerCandidate>(
  candidates: readonly T[],
  previousId: number | null,
  random: () => number = Math.random,
): T | null {
  if (candidates.length === 0) return null;
  const pool = candidates.length > 1 ? candidates.filter((c) => c.id !== previousId) : candidates;
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
  return pool[index] ?? null;
}
