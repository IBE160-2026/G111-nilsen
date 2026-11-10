/** Grensen for tid på en oppskrift: ett døgn (Story 6.2). */
export const MAX_RECIPE_MINUTES = 1440;

/** Gyldig tid i minutter: heltall fra 1 til 1440. */
export function isRecipeMinutes(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_RECIPE_MINUTES
  );
}

/**
 * Leser en ISO 8601-varighet fra oppskriftsdata («PT45M», «PT1H15M», «P0DT2H», «PT90M»,
 * «PT1H30M0S») som minutter. Sekunder avrundes opp til hele minutter. Ugyldig tekst, 0 og mer
 * enn et døgn gir `null`. Kaster aldri.
 */
export function parseIsoDuration(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i.exec(
    value.trim(),
  );
  if (!match || value.trim().toUpperCase() === "P" || value.trim().toUpperCase() === "PT") {
    return null;
  }
  const [, days, hours, minutes, seconds] = match;
  const total =
    Number(days ?? 0) * 1440 +
    Number(hours ?? 0) * 60 +
    Number(minutes ?? 0) +
    Math.ceil(Number(seconds ?? 0) / 60);
  return isRecipeMinutes(total) ? total : null;
}

/** «45 min», «1 t», «1 t 15 min», «24 t». */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} t` : `${hours} t ${rest} min`;
}
