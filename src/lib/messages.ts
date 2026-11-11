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

/** Reservemelding når feiltypen er ukjent eller feilen var uventet. */
export const fallbackMessage: ErrorMessage = {
  title: "Noe gikk galt.",
  body: "Prøv igjen. Skjer det igjen, kan du starte appen på nytt.",
};

export const errorMessages: Record<ErrorKind, ErrorMessage> = {
  invalid_url: {
    title: "Lenken ser ikke riktig ut.",
    body: "Sjekk at hele lenken er med, og prøv igjen.",
  },
  fetch_failed: {
    title: "Vi fikk ikke hentet siden.",
    body: "Sjekk lenken og internettforbindelsen, og prøv igjen. Du kan også legge inn oppskriften selv.",
  },
  no_recipe: {
    title: "Fant ingen oppskrift på siden.",
    body: "Lenken ser ut til å gå til en oversikt. Åpne selve oppskriften og lim inn den lenken, eller legg den inn selv.",
  },
  duplicate: {
    title: "Du har allerede lagret denne oppskriften.",
    body: "Du finner den under Oppskrifter.",
  },
  validation: {
    title: "Noe i skjemaet må rettes.",
    body: "Se meldingene under feltene.",
  },
  not_found: {
    title: "Vi fant ikke oppskriften.",
    body: "Den kan være slettet, eller lenken kan være feil. Gå til forsiden for å komme videre.",
  },
  suggestion_failed: {
    title: "Fikk ikke laget forslag akkurat nå.",
    body: "Prøv igjen senere.",
  },
  login_required: {
    title: "Du må logge inn.",
    body: "Logg inn eller lag en konto for å lagre oppskrifter.",
  },
  unknown: fallbackMessage,
};

/** Norsk melding for en feiltype, med reservemelding for ukjente typer. */
export function messageFor(kind: ErrorKind | string | null | undefined): ErrorMessage {
  if (kind && Object.hasOwn(errorMessages, kind)) {
    return errorMessages[kind as ErrorKind];
  }
  return fallbackMessage;
}

/** Tekster for Importer-siden (Story 2.2). Feilmeldingene hentes fra `errorMessages` via `messageFor`. */
/** Forsiden (`/`): velkomst og snarveier til delene av appen. */
export const homeMessages = {
  tabTitle: "Forside",
  heading: "Fra oppskrift på nettet til middag på bordet",
  lead: "Slutt med lange tekster, reklame og rulling med fete fingre. Lim inn en lenke, så får du oppskriften ryddig og klar til å lage, regnet om til akkurat så mange porsjoner du trenger.",
  cta: "Hent en oppskrift",
  ctaHint: "Du trenger ikke konto for å prøve.",
  howHeading: "Slik virker det",
  steps: [
    {
      title: "Lim inn en lenke",
      text: "RecipeMate henter ingrediensene og stegene og viser dem i et fast, ryddig format.",
    },
    {
      title: "Velg antall porsjoner",
      text: "Mengdene regnes om for deg, også for halve porsjoner.",
    },
    {
      title: "Lag maten",
      text: "Kokemodus viser ett steg om gangen, og tidtakeren starter fra tiden som står i steget.",
    },
  ],
  moreHeading: "Mer enn en samling oppskrifter",
  features: [
    {
      title: "Ukemeny og handleliste",
      text: "Legg oppskrifter på dagene i uka og få én handleliste for hele uka. Kryss av varer du har hjemme.",
    },
    {
      title: "Mapper og favoritter",
      text: "Sorter oppskriftene i mapper som hverdag og helg, og merk dem du kommer tilbake til.",
    },
    {
      title: "Dine egne notater",
      text: "Skriv hva du endret, hvor mange den passer til, og når du sist lagde den.",
    },
    {
      title: "Skriv ut",
      text: "Få en ren utskrift av oppskriften, uten menyer og knapper.",
    },
  ],
  sectionLabel: "Gå rett til",
  guestTitle: "Du er ikke logget inn",
  guestBody:
    "Lag en konto eller logg inn for å lagre oppskrifter, planlegge uka og lage handleliste. Du kan hente og se en oppskrift uten konto.",
  cards: [
    {
      href: "/importer",
      title: "Hent en oppskrift",
      text: "Lim inn en lenke, eller legg inn oppskriften selv.",
    },
    {
      href: "/oppskrifter",
      title: "Oppskrifter",
      text: "Alle oppskriftene du har lagret.",
    },
    {
      href: "/ukemeny",
      title: "Ukemeny",
      text: "Planlegg middagene i uka og lagre dem.",
    },
    {
      href: "/handleliste",
      title: "Handleliste",
      text: "Se hva du må kjøpe, og kryss av i butikken.",
    },
    {
      href: "/mapper",
      title: "Mapper",
      text: "Samle oppskrifter, for eksempel hverdag og helg.",
    },
    {
      href: "/favoritter",
      title: "Favoritter",
      text: "Oppskriftene du kommer tilbake til.",
    },
  ],
} as const;

export const importMessages = {
  heading: "Hent en oppskrift",
  lead: "Lim inn lenken til en oppskrift. RecipeMate henter ingrediensene og stegene og viser dem i et fast og ryddig format.",
  label: "Lenke til oppskriften",
  hint: "For eksempel https://www.matprat.no/oppskrifter/…",
  submit: "Hent oppskrift",
  pending: "Henter oppskriften …",
  /** Lenken i feilmeldingen til den manuelle skjermen. */
  enterManually: "Legg inn selv",
  /** Lenken i feilmeldingen om at oppskriften allerede er lagret. */
  openRecipe: "Åpne oppskriften",
  manualPrompt: "Har du oppskriften selv?",
  tabTitle: "Importer",
} as const;

/** Kilden på oppskriftssiden når den har en lenke (Story 2.2). */
export const sourceLinkMessages = {
  /** Etter kildenavnet i lenkens tilgjengelige navn: «Matprat, åpner kilden i ny fane». */
  opensSuffix: "åpner kilden i ny fane",
} as const;

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
  minutesInvalid: "Skriv tiden i hele minutter, fra 1 til 1440, eller la feltet stå tomt.",
} as const;

/** Tid for oppskriften (Story 6.2). */
export const recipeTimeMessages = {
  label: "Tid (minutter)",
  hint: "Valgfritt. Hvor lang tid oppskriften tar alt i alt, for eksempel 45.",
  shown: (time: string) => `Tid: ${time}`,
  fetch: "Hent tid fra kilden",
  fetching: "Henter tid …",
  notFound: "Fant ingen tid på siden. Du kan skrive den inn under «Rediger».",
} as const;

/**
 * Feltmeldinger når tjenesten avviser et felt (`validation` med feltnavnet i `detail`).
 * Skjemaets egen validering gir som regel en mer presis melding først.
 */
export const manualRecipeFieldInvalid = {
  title: "Skriv en tittel på maks 200 tegn.",
  servings: manualRecipeFieldMessages.servingsInvalid,
  minutes: manualRecipeFieldMessages.minutesInvalid,
  ingredients: "Skriv 1–100 ingredienser, én per linje, hver på maks 300 tegn.",
  steps: "Du kan ha maks 100 steg, hvert på maks 2000 tegn.",
} as const;

/** Feltmelding for porsjonsvelgeren på oppskriftssiden. */
export const servingStepperMessages = {
  invalid: `Skriv et helt tall fra ${LIMITS.servingsMin} til ${LIMITS.servingsMax}. Antallet er ikke endret.`,
  /** Når halve porsjoner er tillatt (Story 5.1). */
  invalidHalf: `Skriv et helt eller halvt tall fra 0,5 til ${LIMITS.servingsMax}, for eksempel 4,5. Antallet er ikke endret.`,
  halfOn: "Legg til en halv porsjon",
  halfOff: "Fjern den halve porsjonen",
  halfLabel: "+ ½",
  sliderLabel: "Skyv for å velge antall porsjoner",
} as const;

/** Dialogen «Hvor mange er oppskriften laget for?» (Story 2.4, FR-3, UX-DR13). */
export const servingsDialogMessages = {
  title: "Hvor mange er oppskriften laget for?",
  description: "Velg antall porsjoner oppskriften er skrevet for, så regnes mengdene riktig om.",
  save: "Lagre",
  cancel: "Avbryt",
  ask: "Oppgi antall porsjoner",
  edit: "endre",
  editLabel: "Endre antallet oppskriften er laget for",
} as const;

/** Tekster for redigering av en oppskrift (Story 3.5). */
/** «Skriv ut» ved oppskriftens tittel (Story 6.6). */
export const printMessages = {
  button: "Skriv ut",
  label: (title: string) => `Skriv ut ${title}`,
} as const;

export const editRecipeMessages = {
  editLink: "Rediger",
  heading: "Rediger",
  lead: "Endre tittel, antall porsjoner, ingredienser eller steg. Ingrediensene tolkes på nytt når du lagrer.",
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
  heading: "Oppskrifter",
  loading: "Henter oppskriftene …",
  loadFailed: "Kunne ikke hente oppskriftene",
  emptyTitle: "Du har ingen lagrede oppskrifter ennå.",
  emptyDescription:
    "Oppskrifter du legger inn eller lagrer, havner her med den sist lagrede øverst.",
  emptyManualAction: "Legg inn selv",
  emptyImportAction: "Importer din første oppskrift",
} as const;

/** «Har hjemme» på handlelisten (Story 5.8). */
export const pantryMessages = {
  button: "Har hjemme",
  buttonFor: (name: string) => `Har hjemme: ${name}`,
  heading: "Har hjemme",
  hint: "Det du har hjemme står ikke på handlelisten. Du kan også skrive inn noe selv, for eksempel salt eller olje.",
  fieldLabel: "Legg til noe du har hjemme",
  add: "Legg til",
  nameRequired: "Skriv hva du har hjemme.",
  nameTooLong: "Navnet kan være maks 60 tegn. Gjør det kortere.",
  empty: "Ingenting ennå.",
  putBack: "Legg tilbake",
  putBackFor: (name: string) => `Legg tilbake på listen: ${name}`,
  hidden: (n: number) =>
    n === 1
      ? "1 vare er skjult fordi du har den hjemme."
      : `${n} varer er skjult fordi du har dem hjemme.`,
  clear: "Tøm listen",
  clearTitle: "Tømme «Har hjemme»?",
  clearDescription: "Alt du har lagt inn fjernes, og varene kommer tilbake på handlelisten.",
  clearConfirm: "Tøm",
  clearCancel: "Avbryt",
  cleared: "«Har hjemme» er tømt.",
  added: (name: string) => `${name} er lagt til i «Har hjemme».`,
  removed: (name: string) => `${name} er lagt tilbake på listen.`,
} as const;

/** Handleliste (Story 5.7). */
export const shoppingMessages = {
  heading: "Handleliste",
  link: "Lag handleliste",
  loading: "Henter oppskriftene …",
  loadFailed: "Kunne ikke hente oppskriftene",
  emptyTitle: "Du har ingen lagrede oppskrifter ennå.",
  emptyDescription: "Lagre oppskrifter først, så kan du velge dem og lage en handleliste.",
  emptyAction: "Se oppskrifter",
  pickHeading: "Velg oppskrifter",
  servingsLabel: "Porsjoner",
  servingsFor: (title: string) => `Antall porsjoner for ${title}`,
  listHeading: "Du må kjøpe",
  nothingPicked: "Velg minst én oppskrift for å lage en liste.",
  fromPrefix: "Til",
  count: (n: number) => (n === 1 ? "1 vare" : `${n} varer`),
  copy: "Kopier listen",
  copied: "Listen er kopiert.",
  copyFailed: "Kunne ikke kopiere. Marker teksten og kopier selv.",
} as const;

/** Metriske mål (Story 5.5). */
export const unitMessages = {
  legend: "Vis mengder i",
  original: "Som i oppskriften",
  dl: "Volum (dl)",
  gram: "Vekt (gram)",
  hint: "Kopper, unser og pund regnes om til norske mål. Mel, sukker, smør, melk og andre vanlige varer regnes mellom dl og gram (ca.).",
} as const;

/** Ukemeny (Story 6.4). */
export const weekMessages = {
  heading: "Ukemeny",
  loading: "Henter ukemenyen …",
  loadFailed: "Kunne ikke hente ukemenyen",
  previous: "Forrige uke",
  next: "Neste uke",
  thisWeek: "Denne uka",
  today: "i dag",
  emptyDay: "Ingenting planlagt.",
  addLabel: (day: string) => `Legg til på ${day}`,
  recipeLabel: "Oppskrift",
  searchPlaceholder: "Søk etter oppskrift",
  noMatch: (query: string) => `Ingen lagrede oppskrifter passer «${query}».`,
  pickFromList: "Velg en oppskrift fra listen.",
  servingsLabel: "Porsjoner",
  addHint:
    "Velg en oppskrift fra listen for å legge den på dagen. Skriv antall porsjoner først hvis du vil ha et annet enn oppskriftens eget. Trykk «Lagre uka» når du er ferdig.",
  remove: "Fjern",
  removeFor: (title: string, day: string) => `Fjern ${title} fra ${day}`,
  portions: (n: string) => `${n} porsj.`,
  added: (title: string, day: string) => `${title} er lagt på ${day}. Husk å lagre uka.`,
  removed: (title: string, day: string) => `${title} er fjernet fra ${day}. Husk å lagre uka.`,
  save: "Lagre uka",
  saving: "Lagrer …",
  saved: "Uka er lagret.",
  unsaved: "Ikke lagret ennå. Trykk «Lagre uka».",
  nothingToSave: "Ingen endringer å lagre.",
  saveFirst: "Lagre uka først, så lages handlelisten av det som er lagret.",
  allWeeksButton: "Se alle uker",
  weekEmpty: "Ingenting er planlagt denne uka.",
  planWeek: "Planlegg uka",
  editWeek: "Endre uka",
  seeShopping: "Se handlelisten for uka",
  backToAllWeeks: "← Alle uker",
  weekTitle: "Ukemeny",
  pickRecipe: "Velg en oppskrift først.",
  invalidServings: "Velg mellom 0,5 og 50 porsjoner.",
  shopping: "Lag handleliste for uka",
  noRecipesTitle: "Du har ingen lagrede oppskrifter ennå.",
  noRecipesDescription: "Lagre oppskrifter først, så kan du legge dem på dagene i uka.",
  noRecipesAction: "Se oppskrifter",
  fromWeek: (week: string) => `Valgt fra ukemenyen: ${week}.`,
  weeksHeading: "Alle uker",
  weeksTitle: "Alle uker",
  weeksHint: "Ukene du har lagret, nyeste først. Åpne en uke for å se menyen og handlelisten.",
  weeksEmpty: "Du har ikke planlagt noen uker ennå.",
  weeksEmptyAction: "Planlegg en uke",
  weekMeals: (n: number) => (n === 1 ? "1 rett" : `${n} retter`),
  thisWeekShort: "denne uka",
} as const;

/** Notater og «sist laget» (Story 6.3). */
export const notesMessages = {
  heading: "Notater",
  label: "Dine notater",
  hint: "Bare for deg, for eksempel «brukte halv sukker» eller «stek 2 minutter kortere».",
  fitsForLabel: "Passer til",
  fitsForHint: "Din egen vurdering, for eksempel «2 sultne» eller «4 barn». Endrer ikke mengdene.",
  fitsForTooLong: "«Passer til» kan være maks 60 tegn. Gjør den kortere.",
  save: "Lagre notat",
  saving: "Lagrer …",
  saved: "Notatet er lagret.",
  tooLong: "Notatene kan være maks 2000 tegn. Gjør dem kortere.",
  cooked: "Laget i dag",
  cookedSaving: "Lagrer …",
  cookedDone: "Merket som laget i dag.",
  never: "Ikke laget ennå.",
  lastCooked: (date: string, count: number) =>
    `Sist laget ${date} · ${count === 1 ? "laget 1 gang" : `laget ${count} ganger`}`,
} as const;

/** Kontoer og innlogging (Story 5.13). */
export const accountMessages = {
  login: "Logg inn",
  logout: "Logg ut",
  register: "Lag konto",
  loginHeading: "Logg inn",
  loginLead: "Logg inn for å se og lagre oppskriftene dine.",
  registerHeading: "Lag en konto",
  registerLead:
    "Med en konto lagres oppskrifter, mapper, favoritter, handleliste og «Har hjemme» på kontoen din.",
  email: "E-post",
  password: "Passord",
  passwordHint: "Minst 8 tegn.",
  loginPending: "Logger inn …",
  registerPending: "Lager konto …",
  noAccount: "Har du ikke konto?",
  haveAccount: "Har du allerede konto?",
  signedInAs: (email: string) => `Logget inn som ${email}`,
  accountMenu: "Konto",
  requiredTitle: "Logg inn for å se dette",
  requiredBody:
    "Oppskrifter, mapper, favoritter og handleliste lagres på kontoen din. Du kan hente og se oppskrifter uten konto.",
  saveNeedsLogin: "Logg inn for å lagre",
  fieldErrors: {
    email_invalid: "Skriv en gyldig e-postadresse, for eksempel navn@eksempel.no.",
    email_taken: "Det finnes allerede en konto med denne e-posten. Logg inn i stedet.",
    password_too_short: "Passordet må ha minst 8 tegn.",
    password_too_long: "Passordet kan ha maks 200 tegn.",
    wrong_credentials: "Feil e-post eller passord.",
  },
} as const;

/** Forslag som er tatt i bruk, vist i ingredienslisten og stegene (Story 5.11). */
export const appliedSuggestionMessages = {
  badge: "Forslag",
  tipsHeading: "Forslag til retten",
  /** Leses opp foran et forslag som er flettet inn i stegteksten (Story 5.12). */
  inlinePrefix: "Forslag:",
} as const;

/** Kokemodus (Story 5.4). */
export const cookingModeMessages = {
  open: "Kokemodus",
  openLabel: "Åpne kokemodus",
  exit: "Avslutt",
  exitLabel: "Avslutt kokemodus",
  previous: "Forrige",
  next: "Neste",
  done: "Ferdig",
  progress: (current: number, total: number) => `Steg ${current} av ${total}`,
  inThisStep: "I dette steget",
  ingredients: "Ingredienser",
  ingredientsFor: (servings: string) => `Ingredienser for ${servings}`,
  /** Tidtaker fra tider i steget (Story 6.5). */
  timerStart: (label: string) => `Start tidtaker: ${label}`,
  timersLabel: "Tidtakere",
  timerFor: (step: number, label: string) => `Steg ${step} · ${label}`,
  timerCancel: "Avbryt",
  timerCancelLabel: (step: number, label: string) => `Avbryt tidtaker for steg ${step} (${label})`,
  timerFinished: (step: number) => `Tiden er ute for steg ${step}`,
  timerAdd: (minutes: number) => `+${minutes} min`,
  timerSubtract: (minutes: number) => `−${minutes} min`,
  timerAddLabel: (step: number, minutes: number) =>
    `Legg til ${minutes} minutt${minutes === 1 ? "" : "er"} på tidtakeren for steg ${step}`,
  timerSubtractLabel: (step: number, minutes: number) =>
    `Trekk fra ${minutes} minutt${minutes === 1 ? "" : "er"} på tidtakeren for steg ${step}`,
  timerTitle: "Tiden er ute",
  timerNotificationBody: "Tidtakeren i kokemodus er ferdig.",
  soundTest: "Test lyden",
  soundTestPlayed: "Spilte en lyd. Hørte du den?",
  soundBlocked:
    "Nettleseren ga ikke lyd. Sjekk at fanen ikke er dempet og at lyden på maskinen er på.",
  timerDismiss: "Lukk",
  timerDismissLabel: (step: number) => `Lukk beskjeden om steg ${step}`,
} as const;

/** Søk og filtrering i Oppskrifter (Story 5.2). */
export const collectionFilterMessages = {
  searchLabel: "Søk i oppskrifter",
  searchHint: "Skriv for eksempel tittel eller ingrediens",
  onlyFavorites: "Bare favoritter",
  folderLabel: "Mappe",
  allFolders: "Alle mapper",
  noMatch: "Ingen oppskrifter passer.",
  noMatchHint: "Prøv et annet søkeord, eller fjern et filter.",
  reset: "Nullstill søk",
  count: (shown: number, total: number) =>
    shown === total
      ? total === 1
        ? "1 oppskrift"
        : `${total} oppskrifter`
      : `${shown} av ${total} oppskrifter`,
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
  descriptionAfterTitle: "fjernes fra oppskriftene dine. Du kan ikke angre.",
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
  emptyAction: "Gå til oppskriftene",
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
    "slettes. Oppskriftene i mappen blir liggende i Oppskrifter, uten mappe. Du kan ikke angre.",
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
  emptyAction: "Gå til oppskriftene",
  /** Foran oppskriftens tittel i hjerteknappens tilgjengelige navn: «Favoritt: Pannekaker». */
  labelPrefix: "Favoritt: ",
  added: "Lagt til i favoritter.",
  removed: "Fjernet fra favoritter.",
} as const;

/** Forslagsdelen på oppskriftssiden (Story 4.1). Feilmeldingen hentes fra `errorMessages`. */
export const suggestionMessages = {
  heading: "Forslag",
  lead: "Få ett til tre forslag til hvordan retten kan bli enda bedre.",
  request: "Få forslag",
  retry: "Prøv igjen",
  pending: "Lager forslag …",
  /** Overskrift over forslagene når de er hentet. */
  resultsHeading: "Forslag til retten",
  exampleLabel: "Enkle forslag",
  exampleNote:
    "Laget ut fra ingrediensene og stegene i oppskriften. Koble til en språkmodell for forslag som er skrevet spesielt for oppskriften.",
  /** Overskrift over forslagene brukeren har tatt i bruk (Story 4.2). */
  chosenHeading: "Dine valgte forslag",
  /** Merket på et valgt forslag. */
  appliedBadge: "Tatt i bruk",
  apply: "Ta i bruk",
  skip: "Hopp over",
  remove: "Fjern",
  appliedStatus: "Forslaget er tatt i bruk.",
  skippedStatus: "Forslaget er hoppet over.",
  removedStatus: "Forslaget er fjernet.",
  allHandled: "Du har tatt stilling til alle forslagene.",
} as const;
