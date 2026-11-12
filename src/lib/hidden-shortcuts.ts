/**
 * Hvilke snarveier på forsiden som er skjult (Story 6.31b). Det er et valg på denne enheten, ikke
 * data på kontoen, så det lagres lokalt. Det er de skjulte som huskes, slik at nye snarveier vises
 * av seg selv. Trygt å kalle uten nettleser; lagring som feiler ignoreres.
 */

export const HIDDEN_SHORTCUTS_KEY = "recipemate-hidden-shortcuts";
export const HIDDEN_SHORTCUTS_EVENT = "recipemate-hidden-shortcuts-changed";

const MAX_HIDDEN = 100;

/** Leser teksten fra lageret; ugyldig innhold gir ingen skjulte snarveier. */
export function parseHiddenShortcuts(raw: string | null): string[] {
  if (raw === null) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is string => typeof v === "string").slice(0, MAX_HIDDEN);
  } catch {
    return [];
  }
}

export function readHiddenShortcutsRaw(): string | null {
  try {
    return window.localStorage.getItem(HIDDEN_SHORTCUTS_KEY);
  } catch {
    return null;
  }
}

export function writeHiddenShortcuts(hidden: readonly string[]): void {
  try {
    window.localStorage.setItem(HIDDEN_SHORTCUTS_KEY, JSON.stringify(hidden));
    window.dispatchEvent(new Event(HIDDEN_SHORTCUTS_EVENT));
  } catch {
    // Å huske valget er en bonus; uten det vises alle snarveiene.
  }
}
