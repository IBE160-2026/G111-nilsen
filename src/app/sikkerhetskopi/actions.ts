"use server";

import { revalidatePath } from "next/cache";
import { actionFailure } from "@/app/_shared/action-result";
import { backupMessages as m } from "@/lib/messages";
import { BACKUP_MAX_BYTES, importBackup } from "@/server/services/backup-service";
import { currentUserId } from "@/server/session";

export type BackupImportState =
  { status: "idle" } | { status: "ok"; message: string } | { status: "error"; message: string };

/**
 * Importerer en sikkerhetskopi-fil (Story 6.15). Filen leses som tekst og JSON, og tjenesten
 * validerer innholdet med zod; ved feil lagres ingenting. Svarer med en norsk melding.
 */
export async function importBackupFile(
  _previous: BackupImportState,
  formData: FormData,
): Promise<BackupImportState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: m.noFile };
  if (file.size > BACKUP_MAX_BYTES) return { status: "error", message: m.tooBig };

  try {
    const userId = await currentUserId();
    if (userId === null) return { status: "error", ...actionFailure("login_required") };

    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch {
      return { status: "error", message: m.invalid };
    }

    const result = importBackup(userId, json);
    if (!result.ok) {
      return {
        status: "error",
        message:
          result.error.detail === "backup_invalid"
            ? m.invalid
            : actionFailure(result.error.kind).message,
      };
    }
    revalidatePath("/", "layout");
    return { status: "ok", message: m.done(result.value.imported, result.value.skipped) };
  } catch (error) {
    console.error("Kunne ikke importere oppskriftene", error);
    return { status: "error", ...actionFailure("unknown") };
  }
}
