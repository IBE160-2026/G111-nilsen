"use server";

import { revalidatePath } from "next/cache";
import { folderFailure, folderIdSchema, parseFolderName } from "@/app/_shared/folder-action";
import { actionFailure, type FolderActionResult } from "@/app/_shared/action-result";
import {
  createFolder as createFolderRecord,
  deleteFolder as deleteFolderRecord,
  renameFolder as renameFolderRecord,
} from "@/server/services/folder-service";
import { currentUserId } from "@/server/session";

/**
 * Mappenavn står på kort, i lagre-linjen og på mappesider, så alle sider revalideres etter
 * en vellykket endring (Story 3.3).
 */
function revalidateAll() {
  revalidatePath("/", "layout");
}

/** Oppretter en mappe. Ugyldig eller opptatt navn gir en melding under feltet. */
export async function createFolder(name: string): Promise<FolderActionResult<{ id: number }>> {
  const parsed = parseFolderName(name);
  if (!parsed.ok) return parsed.result;
  const userId = await currentUserId();
  if (userId === null) return actionFailure("login_required");

  try {
    const result = createFolderRecord(userId, parsed.name);
    if (!result.ok) return folderFailure(result.error);
    revalidateAll();
    return { ok: true, id: result.value.id };
  } catch (error) {
    console.error("Kunne ikke opprette mappen", error);
    return actionFailure(undefined);
  }
}

/** Gir en mappe nytt navn. */
export async function renameFolder(id: number, name: string): Promise<FolderActionResult> {
  if (!folderIdSchema.safeParse(id).success) return actionFailure("not_found");
  const parsed = parseFolderName(name);
  if (!parsed.ok) return parsed.result;
  const userId = await currentUserId();
  if (userId === null) return actionFailure("login_required");

  try {
    const result = renameFolderRecord(userId, id, parsed.name);
    if (!result.ok) return folderFailure(result.error);
    revalidateAll();
    return { ok: true };
  } catch (error) {
    console.error("Kunne ikke gi mappen nytt navn", error);
    return actionFailure(undefined);
  }
}

/** Sletter en mappe; oppskriftene blir liggende i samlingen uten mappe. */
export async function deleteFolder(id: number): Promise<FolderActionResult> {
  if (!folderIdSchema.safeParse(id).success) return actionFailure("not_found");
  const userId = await currentUserId();
  if (userId === null) return actionFailure("login_required");

  try {
    const result = deleteFolderRecord(userId, id);
    if (!result.ok) return folderFailure(result.error);
    revalidateAll();
    return { ok: true };
  } catch (error) {
    console.error("Kunne ikke slette mappen", error);
    return actionFailure(undefined);
  }
}
