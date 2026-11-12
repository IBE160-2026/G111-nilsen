"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { folderFailure, folderIdSchema, parseFolderName } from "@/app/_shared/folder-action";
import { actionFailure, type FolderActionResult } from "@/app/_shared/action-result";
import {
  createFolder as createFolderRecord,
  deleteFolder as deleteFolderRecord,
  renameFolder as renameFolderRecord,
  undoDeleteFolder as undoDeleteFolderRecord,
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

/** Det som trengs for å angre en mappesletting (Story 6.30b): navnet og oppskriftene som lå i mappen. */
export type FolderRestore = { name: string; recipeIds: number[] };

/** Sletter en mappe; oppskriftene blir liggende i samlingen uten mappe. Svaret kan brukes til å angre. */
export async function deleteFolder(
  id: number,
): Promise<FolderActionResult<{ restore: FolderRestore }>> {
  if (!folderIdSchema.safeParse(id).success) return actionFailure("not_found");
  const userId = await currentUserId();
  if (userId === null) return actionFailure("login_required");

  try {
    const result = deleteFolderRecord(userId, id);
    if (!result.ok) return folderFailure(result.error);
    revalidateAll();
    return {
      ok: true,
      restore: { name: result.value.name, recipeIds: result.value.recipeIds },
    };
  } catch (error) {
    console.error("Kunne ikke slette mappen", error);
    return actionFailure(undefined);
  }
}

// Server Actions er offentlige endepunkter: id-ene valideres på nytt (høyst 5000 oppskrifter).
const recipeIdsSchema = z.array(folderIdSchema).max(5000);

/**
 * Angrer en mappesletting (Story 6.30b): lager mappen på nytt og legger oppskriftene tilbake. Er
 * navnet tatt i mellomtiden, kommer en melding og ingenting endres.
 */
export async function undoDeleteFolder(
  name: string,
  recipeIds: number[],
): Promise<FolderActionResult<{ id: number; name: string; restored: number }>> {
  const parsed = parseFolderName(name);
  if (!parsed.ok) return parsed.result;
  const ids = recipeIdsSchema.safeParse(recipeIds);
  if (!ids.success) return actionFailure("not_found");
  const userId = await currentUserId();
  if (userId === null) return actionFailure("login_required");

  try {
    const result = undoDeleteFolderRecord(userId, parsed.name, ids.data);
    if (!result.ok) return folderFailure(result.error);
    revalidateAll();
    return { ok: true, ...result.value };
  } catch (error) {
    console.error("Kunne ikke angre slettingen av mappen", error);
    return actionFailure(undefined);
  }
}
