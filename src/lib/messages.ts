import { LIMITS } from "./recipe-input";
import type { ErrorKind } from "./result";

/**
 * Alle norske feilmeldinger samles her (AD-7); ingen andre steder skriver feiltekst.
 * Du-form, korte setninger, ingen utropstegn: hva skjedde, og hva brukeren kan gjøre.
 */
export type ErrorMessage = {
  title: string;
  body: string;
};

export const errorMessages: Record<ErrorKind, ErrorMessage> = {
  invalid_url: {
    title: "Lenken ser ikke riktig ut.",
    body: "Sjekk at hele lenken er med, og prøv igjen.",
  },
  fetch_failed: {
    title: "Vi fikk ikke hentet siden.",
    body: "Sjekk lenken og internettforbindelsen, og prøv igjen.",
  },
  no_recipe: {
    title: "Vi fant ingen oppskrift på siden.",
    body: "Prøv en annen lenke, eller legg inn oppskriften selv.",
  },
  duplicate: {
    title: "Du har allerede denne oppskriften.",
    body: "Åpne den fra samlingen.",
  },
  validation: {
    title: "Noe i skjemaet må rettes.",
    body: "Se meldingene under feltene.",
  },
  not_found: {
    title: "Vi fant ikke oppskriften.",
    body: "Den kan være slettet, eller lenken kan være feil. Gå til Importer for å hente en oppskrift.",
  },
  suggestion_failed: {
    title: "Vi fikk ikke laget forslag nå.",
    body: "Prøv igjen om litt.",
  },
};

/** Reservemelding når feiltypen er ukjent eller feilen var uventet. */
export const fallbackMessage: ErrorMessage = {
  title: "Noe gikk galt.",
  body: "Prøv igjen. Skjer det igjen, kan du starte appen på nytt.",
};

/** Norsk melding for en feiltype, med reservemelding for ukjente typer. */
export function messageFor(kind: ErrorKind | string | null | undefined): ErrorMessage {
  if (kind && Object.hasOwn(errorMessages, kind)) {
    return errorMessages[kind as ErrorKind];
  }
  return fallbackMessage;
}

/** Feltmeldinger for skjemaet «Legg inn selv» (/ny). */
export const manualRecipeFieldMessages = {
  titleRequired: "Skriv en tittel.",
  titleTooLong: "Tittelen kan være maks 200 tegn. Gjør den kortere.",
  servingsInvalid: "Skriv et helt tall fra 1 til 50.",
  ingredientsRequired: "Skriv minst én ingrediens, én per linje.",
  ingredientsTooMany: "Du kan ha maks 100 ingredienslinjer.",
  ingredientLineTooLong:
    "En ingredienslinje kan være maks 300 tegn. Del den opp eller gjør den kortere.",
  stepsTooMany: "Du kan ha maks 100 steg.",
  stepTooLong: "Et steg kan være maks 2000 tegn. Del det opp i flere steg.",
} as const;

/**
 * Feltmeldinger når tjenesten avviser et felt (`validation` med feltnavnet i `detail`).
 * Skjemaets egen validering gir som regel en mer presis melding først.
 */
export const manualRecipeFieldInvalid = {
  title: "Skriv en tittel på maks 200 tegn.",
  servings: manualRecipeFieldMessages.servingsInvalid,
  ingredients: "Skriv 1–100 ingredienser, én per linje, hver på maks 300 tegn.",
  steps: "Du kan ha maks 100 steg, hvert på maks 2000 tegn.",
} as const;

/** Feltmelding for porsjonsvelgeren på oppskriftssiden. */
export const servingStepperMessages = {
  invalid: `Skriv et helt tall fra ${LIMITS.servingsMin} til ${LIMITS.servingsMax}. Antallet er ikke endret.`,
} as const;

/** Tekster for redigering av en oppskrift (Story 3.5). */
export const editRecipeMessages = {
  editLink: "Rediger",
  heading: "Rediger",
  lead: "Endre tittel, antall personer, ingredienser eller steg. Ingrediensene tolkes på nytt når du lagrer.",
  submit: "Lagre endringer",
  cancel: "Avbryt",
  tabTitle: "Rediger",
} as const;

/** Kilden som vises på oppskrifter uten navn og lenke (oppskriftssiden og kort). */
export const sourceMessages = {
  manual: "Lagt inn selv",
} as const;

/** Tekster for Samlingen (Story 3.1). */
export const collectionMessages = {
  heading: "Samlingen",
  loading: "Henter samlingen …",
  loadFailed: "Kunne ikke hente samlingen",
  emptyTitle: "Du har ingen lagrede oppskrifter ennå.",
  emptyDescription:
    "Oppskrifter du legger inn eller lagrer, havner her med den sist lagrede øverst.",
  emptyManualAction: "Legg inn selv",
  emptyImportAction: "Importer din første oppskrift",
} as const;

/** Tekster for lagre-linjen nederst på oppskriftssiden (Story 3.2). */
export const recipeActionMessages = {
  save: "Lagre",
  saving: "Lagrer …",
  saved: "Lagret.",
  delete: "Slett",
  /** Knappen for mappe når oppskriften ikke ligger i en mappe. */
  chooseFolder: "Lagre i mappe",
  /** Etter «<navn>» i knappens tilgjengelige navn: «Hverdag, bytt mappe». */
  changeFolderSuffix: "bytt mappe",
  /** Meldingen etter at oppskriften er lagt i en mappe; `folderSavedPrefix` + navn + `folderSavedSuffix`. */
  folderSavedPrefix: "Lagret i ",
  folderSavedSuffix: ".",
  folderRemoved: "Fjernet fra mappen.",
} as const;

/** Tekster for dialogen «Slette oppskriften?» (Story 3.2). Tittelen settes inn foran `descriptionAfterTitle`. */
export const deleteDialogMessages = {
  title: "Slette oppskriften?",
  descriptionAfterTitle: "fjernes fra samlingen. Du kan ikke angre.",
  confirm: "Slett",
  cancel: "Avbryt",
} as const;

/** Tekster for Mapper-siden og mappesidene (Story 3.3). */
export const folderMessages = {
  heading: "Mapper",
  loading: "Henter mappene …",
  loadFailed: "Kunne ikke hente mappene",
  folderLoading: "Henter mappen …",
  folderLoadFailed: "Kunne ikke hente mappen",
  /** Fanetittel når mappen ikke finnes. */
  folderDefaultTitle: "Mappe",
  newFolderLabel: "Ny mappe",
  newFolderHint: "Gi mappen et navn på 1–40 tegn.",
  createButton: "Opprett mappe",
  creating: "Oppretter …",
  rename: "Gi nytt navn",
  /** Foran mappenavnet i knappens tilgjengelige navn: «Gi nytt navn til Hverdag». */
  renameFor: "Gi nytt navn til",
  renameField: "Nytt navn",
  save: "Lagre",
  saveFor: "Lagre nytt navn for",
  saving: "Lagrer …",
  cancel: "Avbryt",
  cancelFor: "Avbryt nytt navn for",
  delete: "Slett",
  recipeCountNone: "Ingen oppskrifter",
  recipeCountOne: "1 oppskrift",
  recipeCountMany: "oppskrifter",
  allFolders: "Alle mapper",
  emptyTitle: "Du har ingen mapper ennå.",
  emptyDescription: "Legg oppskrifter i en mappe fra oppskriftssiden.",
  emptyAction: "Gå til samlingen",
  folderEmptyTitle: "Mappen er tom.",
  folderEmptyDescription: "Legg oppskrifter i mappen fra oppskriftssiden.",
  notFoundHeading: "Fant ikke mappen",
  notFoundTitle: "Vi fant ikke mappen.",
  notFoundBody: "Den kan være slettet, eller lenken kan være feil.",
  notFoundAction: "Se alle mapper",
  nameRequired: "Skriv et navn på mappen.",
  nameTooLong: "Navnet kan være maks 40 tegn. Gjør det kortere.",
  nameTaken: "Du har allerede en mappe med dette navnet.",
} as const;

/** Antall oppskrifter i en mappe: «Ingen oppskrifter», «1 oppskrift» eller «3 oppskrifter». */
export function recipeCountLabel(count: number): string {
  if (count === 0) return folderMessages.recipeCountNone;
  if (count === 1) return folderMessages.recipeCountOne;
  return `${count} ${folderMessages.recipeCountMany}`;
}

/** Tekster for dialogen «Slette mappen?» (Story 3.3). Mappenavnet settes inn i `descriptionAfterName`. */
export const deleteFolderDialogMessages = {
  title: "Slette mappen?",
  descriptionAfterName:
    "slettes. Oppskriftene i mappen blir liggende i samlingen, uten mappe. Du kan ikke angre.",
  confirm: "Slett",
  cancel: "Avbryt",
} as const;

/** Tekster for dialogen «Lagre i mappe» (Story 3.3). */
export const folderDialogMessages = {
  title: "Lagre i mappe",
  legend: "Velg mappe",
  noFolder: "Ingen mappe",
  newFolder: "Ny mappe",
  newFolderLabel: "Navn på ny mappe",
  save: "Lagre",
  cancel: "Avbryt",
} as const;

/** Tekster for favoritter (Story 3.4): hjerteknappen og siden Favoritter. */
export const favoriteMessages = {
  heading: "Favoritter",
  loading: "Henter favorittene …",
  loadFailed: "Kunne ikke hente favorittene",
  emptyTitle: "Du har ingen favoritter ennå.",
  emptyDescription: "Trykk på hjertet på en oppskrift for å gjøre den til favoritt.",
  emptyAction: "Gå til samlingen",
  /** Foran oppskriftens tittel i hjerteknappens tilgjengelige navn: «Favoritt: Pannekaker». */
  labelPrefix: "Favoritt: ",
  added: "Lagt til i favoritter.",
  removed: "Fjernet fra favoritter.",
} as const;
