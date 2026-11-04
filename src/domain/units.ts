import type { UnitKey } from "./types";

/**
 * Én kilde for enheter: hver nøkkel med variantene som gjenkjennes.
 * Variantene skrives med små bokstaver og uten punktum.
 */
export const UNIT_VARIANTS: Readonly<Record<UnitKey, readonly string[]>> = {
  g: ["g", "gr", "gram"],
  kg: ["kg", "kilo", "kilogram"],
  ml: ["ml", "milliliter"],
  dl: ["dl", "desiliter"],
  l: ["l", "liter"],
  ss: ["ss", "spiseskje", "spiseskjeer"],
  ts: ["ts", "teskje", "teskjeer"],
  krm: ["krm", "kryddermål"],
  stk: ["stk", "stykk", "stykker"],
  fedd: ["fedd"],
  pk: ["pk", "pakke", "pakker"],
  boks: ["boks", "bokser"],
  neve: ["neve", "never"],
  klype: ["klype", "klyper"],
  kopp: ["kopp", "kopper"],
  pose: ["pose", "poser"],
  bunt: ["bunt", "bunter"],
  skive: ["skive", "skiver"],
  glass: ["glass"],
  beger: ["beger"],
  tbsp: ["tbsp", "tbs", "tablespoon", "tablespoons"],
  tsp: ["tsp", "teaspoon", "teaspoons"],
  cup: ["cup", "cups"],
  oz: ["oz", "ounce", "ounces"],
  lb: ["lb", "lbs", "pound", "pounds"],
  pinch: ["pinch", "pinches"],
  can: ["can", "cans"],
};

const lookup: ReadonlyMap<string, UnitKey> = new Map(
  (Object.entries(UNIT_VARIANTS) as [UnitKey, readonly string[]][]).flatMap(([key, variants]) =>
    variants.map((variant) => [variant, key] as const),
  ),
);

/**
 * Gjør et ord om til en fast enhetsnøkkel, uavhengig av store/små bokstaver og
 * av punktum etter forkortelse («SS.», «stk.»), og av Unicode-form (NFC/NFD).
 * Ukjente ord gir `null`.
 */
export function normalizeUnit(word: string): UnitKey | null {
  const cleaned = word.normalize("NFC").trim().toLowerCase().replace(/\.$/, "");
  return lookup.get(cleaned) ?? null;
}
