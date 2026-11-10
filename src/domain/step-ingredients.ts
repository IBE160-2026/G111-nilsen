import type { RecipeLine } from "./types";

/** Småord og tilberedningsord i ingrediensnavn som ikke skal telle som treff alene. */
const SKIP_WORDS: ReadonlySet<string> = new Set([
  "til",
  "av",
  "fra",
  "med",
  "uten",
  "gjerne",
  "evt",
  "litt",
  "ferske",
  "fersk",
  "finhakket",
  "hakket",
  "revet",
  "skåret",
  "smeltet",
  "myke",
  "mykt",
  "tørket",
  "hele",
  "store",
  "små",
  "stor",
  "liten",
  "vanlig",
  "frisk",
  "malt",
  "kokt",
  "rå",
  "stekt",
  "til",
  "steking",
  "pensling",
  "servering",
  "garnityr",
  "smaksetting",
  "and",
  "the",
  "of",
  "for",
]);

/** Endelser et ord kan ha i bestemt form eller flertall: «melken», «eggene», «løken». */
const ENDINGS: ReadonlySet<string> = new Set(["", "en", "et", "a", "er", "ene", "ne", "e", "s"]);

function words(text: string): string[] {
  return text
    .normalize("NFC")
    .toLocaleLowerCase("nb")
    .split(/[^\p{L}]+/u)
    .filter(Boolean);
}

/** Ordene i ingrediensnavnet som kan gjenkjennes i en steg-tekst. */
function keywords(line: RecipeLine): string[] {
  return words(line.name || line.original).filter((w) => w.length >= 3 && !SKIP_WORDS.has(w));
}

function wordMatches(keyword: string, word: string): boolean {
  if (word.startsWith(keyword) && ENDINGS.has(word.slice(keyword.length))) return true;
  // Sammensetninger: «hvetemel» i ingredienslisten og «mel» i steget, og omvendt.
  if (word.length >= 3 && keyword.length > word.length && keyword.endsWith(word)) return true;
  for (const ending of ENDINGS) {
    // «melet» i steget for «hvetemel» i listen: ordet minus endingen er slutten av ingrediensen.
    const stem = ending === "" ? "" : word.slice(0, word.length - ending.length);
    if (
      ending !== "" &&
      word.endsWith(ending) &&
      stem.length >= 3 &&
      keyword.length > stem.length &&
      keyword.endsWith(stem)
    ) {
      return true;
    }
  }
  if (keyword.length >= 3 && word.length > keyword.length && word.endsWith(keyword)) return true;
  return false;
}

/**
 * Ingredienslinjene som nevnes i en steg-tekst (Story 5.6), i ingredienslistens rekkefølge.
 * Et treff er at et ord fra ingrediensnavnet står i teksten, i bestemt form eller flertall
 * («melken» for «melk»), eller som del av en sammensetning («mel» for «hvetemel»). Det er en
 * enkel regel uten ordliste: den kan overse en ingrediens, og viser en ingrediens uten treff
 * aldri. Ren funksjon; kaster aldri.
 */
export function ingredientsForStep(stepText: string, lines: readonly RecipeLine[]): RecipeLine[] {
  const stepWords = words(stepText);
  if (stepWords.length === 0) return [];
  return [...lines]
    .sort((a, b) => a.position - b.position)
    .filter((line) =>
      keywords(line).some((keyword) => stepWords.some((word) => wordMatches(keyword, word))),
    );
}
