/** Mengde i en ingredienslinje. `max` finnes bare for områder («2–3»). */
export type Quantity = { min: number; max?: number };

/** Faste nøkler for enheter. Alle varianter normaliseres hit via `units.ts`. */
export type UnitKey =
  | "g"
  | "kg"
  | "ml"
  | "dl"
  | "l"
  | "ss"
  | "ts"
  | "krm"
  | "stk"
  | "fedd"
  | "pk"
  | "boks"
  | "neve"
  | "klype"
  | "kopp"
  | "pose"
  | "bunt"
  | "skive"
  | "glass"
  | "beger"
  | "tbsp"
  | "tsp"
  | "cup"
  | "oz"
  | "lb"
  | "pinch"
  | "can";

/** Resultatet av å tolke én ingredienslinje. `original` er alltid input, uendret. */
export type ParsedLine = {
  original: string;
  quantity: Quantity | null;
  unit: UnitKey | null;
  name: string;
  parseable: boolean;
};
