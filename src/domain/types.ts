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

/** En ingredienslinje etter skalering. `approximate` betyr at mengden er avrundet til «ca.». */
export type ScaledLine = ParsedLine & { approximate: boolean };

/**
 * En lagret ingredienslinje: tolkningen pluss plassering i oppskriften.
 * `original` er linjen slik brukeren skrev den (trimmet); skalerte verdier lagres aldri.
 */
export type RecipeLine = ParsedLine & {
  id: number;
  position: number;
  section: string | null;
};

/** Et steg i fremgangsmåten. */
export type Step = {
  id: number;
  position: number;
  section: string | null;
  text: string;
};

/**
 * En lagret oppskrift. Tidspunkt er ISO 8601-tekst i UTC.
 * `savedAt === null` betyr at oppskriften ikke er i samlingen ennå.
 */
export type Recipe = {
  id: number;
  title: string;
  sourceUrl: string | null;
  sourceName: string | null;
  originalServings: number | null;
  selectedServings: number | null;
  savedAt: string | null;
  createdAt: string;
  updatedAt: string;
  ingredients: RecipeLine[];
  steps: Step[];
};

/** En oppskrift slik den vises som kort i samlingen. `savedAt` er alltid satt. */
export type RecipeSummary = Pick<Recipe, "id" | "title" | "sourceUrl" | "sourceName"> & {
  savedAt: string;
};
