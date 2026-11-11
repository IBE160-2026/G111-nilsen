export type DinnerCandidate = {
  id: number;
  title: string;
  totalMinutes: number | null;
  isFavorite: boolean;
};

export type DinnerFilter = {
  onlyFavorites: boolean;
  /** Høyeste tid i minutter, eller `null` for alle. Oppskrifter uten tid regnes ikke med når den er satt. */
  maxMinutes: number | null;
};

/** Oppskriftene som passer filteret (Story 6.13). */
export function dinnerCandidates<T extends DinnerCandidate>(
  recipes: readonly T[],
  filter: DinnerFilter,
): T[] {
  return recipes.filter(
    (recipe) =>
      (!filter.onlyFavorites || recipe.isFavorite) &&
      (filter.maxMinutes === null ||
        (recipe.totalMinutes !== null && recipe.totalMinutes <= filter.maxMinutes)),
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
