import type { ErrorKind } from "@/lib/result";

/** Feilsvaret fra importen: norsk tekst fra `messageFor`, og id-en til en allerede lagret oppskrift. */
export type ImportFailure = {
  ok: false;
  kind: ErrorKind;
  title: string;
  body: string;
  /** Bare for `duplicate`: oppskriften brukeren allerede har lagret. */
  recipeId?: number;
};

/** Tilstanden til Importer-skjemaet. `attempt` teller forsøk, så samme feil kan leses opp igjen. */
export type ImportFormState = {
  /** Lenken slik brukeren skrev den; står igjen i feltet ved feil. */
  url: string;
  error?: ImportFailure;
  attempt: number;
};

export const initialImportState: ImportFormState = { url: "", attempt: 0 };
