import type { ErrorKind } from "./result";

/**
 * Alle norske feilmeldinger samles her (AD-7); ingen andre steder skriver feiltekst.
 * Tabellen fylles ut i senere stories etter hvert som feiltypene tas i bruk.
 */
export type ErrorMessage = {
  title: string;
  body: string;
};

export const errorMessages: Partial<Record<ErrorKind, ErrorMessage>> = {};
