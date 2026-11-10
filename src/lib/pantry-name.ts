import { normalizeSearch } from "@/domain";

/** Lengste navn på noe man har hjemme. */
export const PANTRY_NAME_MAX_LENGTH = 60;

/** Trimmer og samler mellomrom, så «  olivenolje  » og «olivenolje» er det samme. */
export function cleanPantryName(name: string): string {
  return name.normalize("NFC").replace(/\s+/g, " ").trim();
}

/** Nøkkelen navn sammenlignes på: små bokstaver og NFC (samme som handlelisten bruker). */
export function pantryNameKey(name: string): string {
  return normalizeSearch(name);
}
