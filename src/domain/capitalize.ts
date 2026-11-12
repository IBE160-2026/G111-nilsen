/**
 * Stor forbokstav ved visning (Story 6.28b): ingrediensnavn og setninger i stegene vises med stor
 * forbokstav, uansett hvordan teksten ble skrevet eller importert. Teksten i databasen endres ikke.
 * Ren funksjon uten database.
 */

/** Teksten med første bokstav stor. Tekst som ikke begynner med en bokstav (tall, tegn) er uendret. */
export function capitalizeFirst(text: string): string {
  const first = text.charAt(0);
  const upper = first.toLocaleUpperCase("nb-NO");
  return first !== upper && upper.length === 1 ? upper + text.slice(1) : text;
}

/** Forkortelser som avsluttes med punktum midt i en setning: ordet etter dem skal ikke få stor bokstav. */
const ABBREVIATIONS = new Set([
  "ca",
  "dvs",
  "evt",
  "f.eks",
  "feks",
  "bl.a",
  "osv",
  "inkl",
  "ekskl",
  "mv",
  "mm",
  "nr",
  "pga",
  "jf",
  "cl",
  "dl",
  "ts",
  "ss",
  "stk",
  "pk",
  "bl",
]);

/**
 * Teksten med første bokstav stor, og første bokstav etter punktum, utropstegn eller spørsmålstegn
 * og mellomrom. Etter en forkortelse («ca. en time», «f.eks. smør») og i tall («1.5 dl») endres
 * ingenting.
 */
export function capitalizeSentences(text: string): string {
  const result = capitalizeFirst(text);
  return result.replace(
    /([^\s]+)([.!?])(\s+)(\p{Ll})/gu,
    (match, word: string, mark: string, space: string, letter: string) => {
      if (mark === "." && ABBREVIATIONS.has(word.toLocaleLowerCase("nb-NO").replace(/\.$/, ""))) {
        return match;
      }
      return `${word}${mark}${space}${letter.toLocaleUpperCase("nb-NO")}`;
    },
  );
}
