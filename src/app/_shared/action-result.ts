import type { SuggestionSet } from "@/domain";
import { messageFor } from "@/lib/messages";

/** Svaret fra en Server Action som ikke sender brukeren videre: ok, eller en norsk melding. */
export type ActionResult = { ok: true } | { ok: false; message: string };

/** Feilsvar med melding fra `messageFor` (tittel og forklaring i én tekst). */
export function actionFailure(kind: string | undefined): { ok: false; message: string } {
  const message = messageFor(kind);
  return { ok: false, message: `${message.title} ${message.body}` };
}

/**
 * Svaret fra en mappehandling (Story 3.3): ok med eventuelle data, eller en norsk melding.
 * `field: "name"` betyr at meldingen hører under navnefeltet; uten `field` gjelder den hele handlingen.
 */
export type FolderActionResult<T extends object = object> =
  ({ ok: true } & T) | { ok: false; field?: "name"; message: string };

/** Svaret fra «Få forslag» (Story 4.1): forslagene, eller `ok: false` (komponenten viser meldingen). */
export type SuggestionsActionResult = ({ ok: true } & SuggestionSet) | { ok: false };
