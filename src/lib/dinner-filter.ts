/**
 * Filteret på middagsforslag huskes i nettleseren (Story 6.22b): bare favoritter, tid og mapper.
 * Det er et valg på denne enheten, ikke data på kontoen, så det lagres lokalt. Alt her er trygt å
 * kalle uten nettleser; lagring som feiler (privat modus, full plass) ignoreres.
 */

export const DINNER_FILTER_KEY = "recipemate-dinner-filter";
/** Filteret endres: andre deler av samme vindu får beskjed med dette. */
export const DINNER_FILTER_EVENT = "recipemate-dinner-filter-changed";

export type DinnerFilterChoice = {
  onlyFavorites: boolean;
  maxMinutes: number | null;
  /** Mappenavn, eller `null` for «Uten mappe». Tom = alle mapper. */
  folders: readonly (string | null)[];
};

export const DEFAULT_DINNER_FILTER: DinnerFilterChoice = {
  onlyFavorites: false,
  maxMinutes: null,
  folders: [],
};

const MAX_FOLDERS = 200;

/** Leser og kontrollerer teksten fra lageret; ugyldig innhold gir standardvalget. */
export function parseDinnerFilter(raw: string | null): DinnerFilterChoice {
  if (raw === null) return DEFAULT_DINNER_FILTER;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return DEFAULT_DINNER_FILTER;
    const filter = value as Record<string, unknown>;
    const maxMinutes =
      typeof filter.maxMinutes === "number" &&
      Number.isInteger(filter.maxMinutes) &&
      filter.maxMinutes > 0 &&
      filter.maxMinutes <= 10_000
        ? filter.maxMinutes
        : null;
    const folders = Array.isArray(filter.folders)
      ? filter.folders
          .filter((f): f is string | null => f === null || typeof f === "string")
          .slice(0, MAX_FOLDERS)
      : [];
    return { onlyFavorites: filter.onlyFavorites === true, maxMinutes, folders };
  } catch {
    return DEFAULT_DINNER_FILTER;
  }
}

/** Den lagrede teksten (uten å tolke den), eller `null`. */
export function readDinnerFilterRaw(): string | null {
  try {
    return window.localStorage.getItem(DINNER_FILTER_KEY);
  } catch {
    return null;
  }
}

/** Lagrer valget og gir beskjed til lyttere i samme vindu. */
export function writeDinnerFilter(choice: DinnerFilterChoice): void {
  try {
    window.localStorage.setItem(DINNER_FILTER_KEY, JSON.stringify(choice));
    window.dispatchEvent(new Event(DINNER_FILTER_EVENT));
  } catch {
    // Å huske valget er en bonus; uten det virker siden som før.
  }
}
