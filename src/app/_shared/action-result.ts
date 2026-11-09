import { messageFor } from "@/lib/messages";

/** Svaret fra en Server Action som ikke sender brukeren videre: ok, eller en norsk melding. */
export type ActionResult = { ok: true } | { ok: false; message: string };

/** Feilsvar med melding fra `messageFor` (tittel og forklaring i én tekst). */
export function actionFailure(kind: string | undefined): ActionResult {
  const message = messageFor(kind);
  return { ok: false, message: `${message.title} ${message.body}` };
}
