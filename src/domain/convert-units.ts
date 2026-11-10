import { normalizeSearch } from "./filter-collection";
import { roundWeightVolume } from "./scale-line";
import type { ScaledLine, UnitKey } from "./types";

/**
 * Hvilke mål mengdene vises i. `original` viser linjen slik den står (etter skalering). `dl`
 * viser volum (dl, l) og `gram` vekt (g, kg) når ingrediensen er kjent; resten regnes om etter
 * de vanlige reglene (kopper, unser, pund).
 */
export type UnitSystem = "original" | "dl" | "gram";

type Rule = {
  unit: UnitKey;
  /** Hvor mange av målenheten én original enhet tilsvarer. */
  factor: number;
  /** `true` når omregningen er avrundet nok til at mengden vises som «ca.». */
  approximate: boolean;
};

/**
 * Amerikanske mål til norske (Story 5.5). Kopp = 2,4 dl, unse = 28 g, pund = 450 g er de
 * vanlige kjøkkenverdiene. Spiseskje og teskje likestilles (15 og 5 ml), så de er ikke «ca.».
 */
const METRIC_RULES: Readonly<Partial<Record<UnitKey, Rule>>> = {
  cup: { unit: "dl", factor: 2.4, approximate: true },
  oz: { unit: "g", factor: 28.35, approximate: true },
  lb: { unit: "g", factor: 453.6, approximate: true },
  tbsp: { unit: "ss", factor: 1, approximate: false },
  tsp: { unit: "ts", factor: 1, approximate: false },
};

/** Volumenheter og hvor mange ml én av dem er. */
const ML_PER_UNIT: Readonly<Partial<Record<UnitKey, number>>> = {
  ml: 1,
  dl: 100,
  l: 1000,
  krm: 1,
  ts: 5,
  tsp: 5,
  ss: 15,
  tbsp: 15,
  cup: 240,
};

/** Vektenheter og hvor mange gram én av dem er. */
const GRAM_PER_UNIT: Readonly<Partial<Record<UnitKey, number>>> = {
  g: 1,
  kg: 1000,
  oz: 28.35,
  lb: 453.6,
};

/**
 * Omtrentlig vekt i gram per dl for vanlige ingredienser (Story 5.9). Tallene er runde
 * kjøkkenverdier, så omregning mellom dl og gram vises alltid som «ca.». Ord som slutter på
 * en nøkkel i `COMPOUND_KEYS` regnes også med («hvetemel», «olivenolje»).
 */
const GRAMS_PER_DL: ReadonlyArray<readonly [readonly string[], number]> = [
  [["potetmel"], 80],
  [["mel", "flour"], 60],
  [["maisenna", "maizena", "cornstarch"], 60],
  [["sukker", "sugar"], 85],
  [["melis"], 60],
  [["farin"], 80],
  [["smør", "butter", "margarin"], 90],
  [["olje", "oil"], 90],
  [["melk", "milk", "vann", "water", "fløte", "cream", "rømme", "yoghurt", "yogurt"], 100],
  [["honning", "honey", "sirup"], 140],
  [["havregryn", "oats"], 35],
  [["ris", "rice"], 85],
  [["salt"], 120],
  [["kakao", "cocoa"], 45],
];

const COMPOUND_KEYS: ReadonlySet<string> = new Set([
  "mel",
  "olje",
  "sukker",
  "fløte",
  "smør",
  "melk",
  "salt",
  "ris",
]);
const NOT_COMPOUNDS: ReadonlySet<string> = new Set(["caramel", "karamel"]);

/**
 * Gram per dl for ingrediensen, eller `null` når den ikke er kjent. Linjer med flere
 * ingredienser («salt og pepper») regnes ikke om.
 */
export function gramsPerDl(name: string): number | null {
  const words = normalizeSearch(name)
    .split(/[^\p{L}]+/u)
    .filter(Boolean);
  if (words.includes("og") || words.includes("eller") || words.includes("and")) return null;
  for (const [keys, density] of GRAMS_PER_DL) {
    for (const word of words) {
      if (NOT_COMPOUNDS.has(word)) continue;
      if (keys.some((key) => word === key || (COMPOUND_KEYS.has(key) && word.endsWith(key)))) {
        return density;
      }
    }
  }
  return null;
}

/** Har linjen en enhet som kan regnes om (kopper, unser, pund eller dl/gram for kjent vare)? */
export function hasConvertibleUnit(line: {
  unit: UnitKey | null;
  parseable: boolean;
  name?: string;
}): boolean {
  if (!line.parseable || line.unit === null) return false;
  if (METRIC_RULES[line.unit] !== undefined) return true;
  const mass = GRAM_PER_UNIT[line.unit] !== undefined;
  const volume = ML_PER_UNIT[line.unit] !== undefined;
  return (mass || volume) && line.name !== undefined && gramsPerDl(line.name) !== null;
}

const round1 = (value: number) => Math.round(value * 10 + 1e-9) / 10;

/** Gjør om mengden med `factor` til `target` (g eller dl, og kg eller l for store mengder). */
function applyFactor(
  line: ScaledLine,
  factor: number,
  target: "g" | "dl" | UnitKey,
  approximate: boolean,
): ScaledLine {
  if (line.quantity === null) return line;
  const largest = (line.quantity.max ?? line.quantity.min) * factor;

  let unit: UnitKey = target;
  let scale = factor;
  let round = (value: number) => value;
  if (target === "g") {
    round = roundWeightVolume;
    if (largest >= 1000) {
      unit = "kg";
      scale = factor / 1000;
      round = round1;
    }
  } else if (target === "dl") {
    round = round1;
    if (largest >= 10) {
      unit = "l";
      scale = factor / 10;
    }
  }

  const min = round(line.quantity.min * scale);
  const max = line.quantity.max === undefined ? undefined : round(line.quantity.max * scale);
  return {
    ...line,
    unit,
    quantity: max !== undefined && max > min ? { min, max } : { min },
    approximate: line.approximate || approximate,
  };
}

/**
 * Regner en (skalert) linje om til valgt målsystem. Ren visning: originalen røres aldri (AD-2).
 * `dl` gjør vekt om til volum og `gram` volum om til vekt for kjente ingredienser (ca.); alle
 * andre linjer med kopper, unser og pund regnes til norske mål. Ikke tolkbare linjer, linjer
 * uten omregnbar enhet og `original` gir linjen uendret. Gram over 1000 vises som kg og dl
 * over 10 som l. Kaster aldri.
 */
export function convertLine(line: ScaledLine, system: UnitSystem): ScaledLine {
  if (system === "original" || !hasConvertibleUnit(line) || line.quantity === null) return line;
  const unit = line.unit as UnitKey;
  const density = gramsPerDl(line.name);

  if (density !== null) {
    const ml = ML_PER_UNIT[unit];
    const grams = GRAM_PER_UNIT[unit];
    if (system === "gram" && ml !== undefined) {
      return applyFactor(line, (ml * density) / 100, "g", true);
    }
    if (system === "dl" && grams !== undefined) {
      return applyFactor(line, grams / density, "dl", true);
    }
  }

  const rule = METRIC_RULES[unit];
  return rule ? applyFactor(line, rule.factor, rule.unit, rule.approximate) : line;
}
