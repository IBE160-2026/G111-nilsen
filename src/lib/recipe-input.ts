/**
 * Felles grenser og linjedeling for oppskrifter brukeren skriver selv.
 * Brukes både av zod-skjemaet i /ny og av recipe-service, så reglene er like.
 */
export const LIMITS = {
  titleLength: 200,
  servingsMin: 1,
  servingsMax: 50,
  linesPerField: 100,
  ingredientLineLength: 300,
  stepLength: 2000,
} as const;

/** Deler tekst i linjer, trimmer hver linje og fjerner tomme. Rekkefølgen beholdes. */
export function splitLines(text: string): string[] {
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}
