/** Tolker id-en i `/oppskrift/[id]`. Bare positive heltall er gyldige; alt annet gir `null`. */
export function parseRecipeId(raw: string): number | null {
  if (!/^[1-9]\d{0,15}$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}
