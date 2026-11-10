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
  /** Satt for en linje som kommer fra et forslag brukeren har tatt i bruk (Story 5.11). */
  suggested?: boolean;
};

/** Et steg i fremgangsmåten. */
export type Step = {
  id: number;
  position: number;
  section: string | null;
  text: string;
  /** Satt for et steg som kommer fra et forslag brukeren har tatt i bruk (Story 5.11). */
  suggested?: boolean;
  /** Forslag som er flettet inn i stegteksten, før og etter den lagrede teksten (Story 5.12). */
  addedBefore?: string[];
  addedAfter?: string[];
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
  /** Mappen oppskriften ligger i (bare lagrede oppskrifter kan ligge i en mappe), ellers `null`. */
  folderId: number | null;
  /** Favoritt (Story 3.4). Bare oppskrifter i samlingen kan være favoritt. */
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  ingredients: RecipeLine[];
  steps: Step[];
  /** Hvor lang tid oppskriften tar, i minutter (Story 6.2); `null` eller utelatt = ikke oppgitt. */
  totalMinutes?: number | null;
  /** Forslag brukeren har tatt i bruk (Story 4.2), eldste først. Endrer aldri ingredienser eller steg. */
  suggestions: AppliedSuggestion[];
};

/**
 * En oppskrift slik den vises som kort i samlingen. `savedAt` er alltid satt. `folderName` er
 * navnet på mappen oppskriften ligger i, ellers `null`.
 */
export type RecipeSummary = Pick<
  Recipe,
  "id" | "title" | "sourceUrl" | "sourceName" | "isFavorite"
> & {
  savedAt: string;
  folderName: string | null;
};

/** En mappe for oppskrifter (Story 3.3). `name` er navnet slik brukeren skrev det. */
export type Folder = { id: number; name: string };

/** En mappe med antall oppskrifter i den. */
export type FolderSummary = Folder & { recipeCount: number };

/** Hvilken del av oppskriften et forslag gjelder: ingrediensene, stegene eller hele retten. */
export type SuggestionTarget = "ingredients" | "steps" | "recipe";

/** Ett forslag til å gjøre retten bedre (Story 4.1), med begrunnelse. Lagres ikke ennå. */
export type Suggestion = {
  text: string;
  reason: string;
  appliesTo: SuggestionTarget;
};

/** Et forslag brukeren har tatt i bruk og som er lagret med oppskriften (Story 4.2). */
export type AppliedSuggestion = Suggestion & { id: number };

/** Forslag for en oppskrift. `isExample` er sant når de er eksempelforslag (demomodus). */
export type SuggestionSet = {
  suggestions: Suggestion[];
  isExample: boolean;
};
