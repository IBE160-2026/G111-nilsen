/** Grenser for mappenavn (Story 3.3). Lengden telles i Unicode-tegn, ikke UTF-16-enheter. */
export const FOLDER_NAME_MAX_LENGTH = 40;

/** Usynlige tegn `\s` ikke dekker: nullbreddemellomrom, ordforbinder, bløt bindestrek, BOM og mongolsk vokalskilletegn. */
const INVISIBLE = /[\u00AD\u180E\u200B\u2060\uFEFF]/g;

/**
 * Gjør navnet klart for lagring: NFC-normalisert (så sammensatte og dekomponerte tegn
 * telles likt), uten usynlige tegn, trimmet, og med blanke tegn i serie slått sammen til ett
 * mellomrom. Et navn uten synlige tegn (bare blanke og formateringstegn) blir tomt.
 */
export function cleanFolderName(raw: string): string {
  const cleaned = raw.normalize("NFC").replace(INVISIBLE, "").trim().replace(/\s+/g, " ");
  return /^[\p{Cf}\p{Z}]*$/u.test(cleaned) ? "" : cleaned;
}

/** Antall Unicode-tegn (kodepunkter); en emoji teller som ett. */
export function folderNameLength(name: string): number {
  return Array.from(name).length;
}

/**
 * Nøkkelen navn sammenlignes på: NFC-normalisert og med små bokstaver etter norske regler, så
 * «Hverdag», «HVERDAG» og «hverdag» (også «ÆRLIG» og «ærlig») er samme mappe.
 */
export function folderNameKey(name: string): string {
  return name.normalize("NFC").toLocaleLowerCase("nb");
}
