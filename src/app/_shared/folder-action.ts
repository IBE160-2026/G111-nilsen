import { z } from "zod";
import { actionFailure, type FolderActionResult } from "@/app/_shared/action-result";
import { cleanFolderName, FOLDER_NAME_MAX_LENGTH, folderNameLength } from "@/lib/folder-name";
import { folderMessages } from "@/lib/messages";
import { parseRecipeId } from "@/lib/recipe-id";
import type { AppError } from "@/lib/result";

/** Id (mappe eller oppskrift) fra en Server Action: positivt heltall (samme regel som `parseRecipeId`). */
export const folderIdSchema = z.number().refine((id) => parseRecipeId(String(id)) !== null);

/**
 * Navnet som Server Actions godtar: tekst, renset (trimmet, blanke tegn slått sammen) og
 * 1–40 Unicode-tegn. Unikhet sjekkes i tjenesten. Feilmeldingene hører under navnefeltet.
 */
export const folderNameSchema = z
  .string()
  .transform(cleanFolderName)
  .pipe(
    z
      .string()
      .min(1, { error: folderMessages.nameRequired })
      .refine((name) => folderNameLength(name) <= FOLDER_NAME_MAX_LENGTH, {
        error: folderMessages.nameTooLong,
      }),
  );

/** Feil under navnefeltet: den første meldingen fra `folderNameSchema`. */
export function nameFailure(message: string): FolderActionResult<never> {
  return { ok: false, field: "name", message };
}

const nameErrorMessages: Record<string, string> = {
  name_required: folderMessages.nameRequired,
  name_too_long: folderMessages.nameTooLong,
  name_taken: folderMessages.nameTaken,
};

/** Gjør en feil fra mappetjenesten om til svar: navnefeil under feltet, alt annet generell melding. */
export function folderFailure(error: AppError): FolderActionResult<never> {
  if (
    error.kind === "validation" &&
    error.detail &&
    Object.hasOwn(nameErrorMessages, error.detail)
  ) {
    return nameFailure(nameErrorMessages[error.detail]);
  }
  return actionFailure(error.kind);
}

/** Validerer navnet; ved feil et svar med melding under feltet. */
export function parseFolderName(
  name: unknown,
): { ok: true; name: string } | { ok: false; result: FolderActionResult<never> } {
  const parsed = folderNameSchema.safeParse(name);
  if (parsed.success) return { ok: true, name: parsed.data };
  const message = parsed.error.issues[0]?.message ?? folderMessages.nameRequired;
  return { ok: false, result: nameFailure(message) };
}
