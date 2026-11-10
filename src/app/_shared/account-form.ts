/** Tilstanden til skjemaene «Logg inn» og «Lag konto» (Story 5.13). */
export type AccountFormState = {
  /** E-posten brukeren skrev, så feltet beholder den etter en feil. Passord sendes aldri tilbake. */
  email: string;
  emailError?: string;
  passwordError?: string;
  /** Melding for hele skjemaet (feil e-post eller passord, uventet feil). */
  formError?: string;
};

export const EMPTY_ACCOUNT_FORM: AccountFormState = { email: "" };
