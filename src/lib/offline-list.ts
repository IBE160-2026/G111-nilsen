/**
 * Handlelisten uten nett (Story 6.17). Mens brukeren ser handlelisten, lagres et lite utdrag (varer
 * og avkrysninger, ikke oppskriftene) i nettleseren, så «Du er frakoblet»-siden kan vise det og
 * la brukeren krysse av i butikken. Utdraget slettes ved utlogging. Alt her er trygt å kalle uten
 * nettleser; lagring som feiler (privat modus, full plass) ignoreres.
 */

export const OFFLINE_LIST_KEY = "recipemate-offline-list";
/** Utdraget endres: samme side i et annet vindu eller en annen fane får beskjed med dette. */
export const OFFLINE_LIST_EVENT = "recipemate-offline-list-changed";
const MAX_ITEMS = 500;

export type OfflineListItem = { key: string; text: string; from: string };

export type OfflineList = {
  version: 1;
  title: string;
  /** ISO-tidspunkt for når listen sist ble lagret. */
  savedAt: string;
  items: OfflineListItem[];
  /** Nøklene til varene som er krysset av. */
  checked: string[];
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

/** Leser og kontrollerer teksten fra lageret; ugyldig innhold gir `null`. */
export function parseOfflineList(raw: string | null): OfflineList | null {
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const list = value as Record<string, unknown>;
    if (
      list.version !== 1 ||
      typeof list.title !== "string" ||
      typeof list.savedAt !== "string" ||
      !Array.isArray(list.items) ||
      list.items.length > MAX_ITEMS ||
      !isStringArray(list.checked)
    ) {
      return null;
    }
    const items: OfflineListItem[] = [];
    for (const item of list.items) {
      if (typeof item !== "object" || item === null) return null;
      const { key, text, from } = item as Record<string, unknown>;
      if (typeof key !== "string" || typeof text !== "string" || typeof from !== "string") {
        return null;
      }
      items.push({ key, text, from });
    }
    return { version: 1, title: list.title, savedAt: list.savedAt, items, checked: list.checked };
  } catch {
    return null;
  }
}

function notify(): void {
  try {
    window.dispatchEvent(new Event(OFFLINE_LIST_EVENT));
  } catch {
    // Ingen nettleser: ingen å si fra til.
  }
}

/** Den lagrede teksten (uten å tolke den), eller `null`. */
export function readOfflineListRaw(): string | null {
  try {
    return window.localStorage.getItem(OFFLINE_LIST_KEY);
  } catch {
    return null;
  }
}

/** Lagrer listen. En liste uten varer sletter utdraget. */
export function writeOfflineList(list: OfflineList): void {
  if (list.items.length === 0) {
    clearOfflineList();
    return;
  }
  try {
    window.localStorage.setItem(OFFLINE_LIST_KEY, JSON.stringify(list));
    notify();
  } catch {
    // Lagring er en bonus; uten den virker handlelisten som før.
  }
}

/** Sletter utdraget (ved utlogging, eller når listen er tom). */
export function clearOfflineList(): void {
  try {
    if (window.localStorage.getItem(OFFLINE_LIST_KEY) === null) return;
    window.localStorage.removeItem(OFFLINE_LIST_KEY);
    notify();
  } catch {
    // Se over.
  }
}

/** Listen med varen krysset av eller ikke. Ren funksjon. */
export function withChecked(list: OfflineList, key: string, checked: boolean): OfflineList {
  const others = list.checked.filter((entry) => entry !== key);
  return { ...list, checked: checked ? [...others, key] : others };
}
