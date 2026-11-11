"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { actionFailure, type ActionResult } from "@/app/_shared/action-result";
import { deleteDeletedRecipeForGood, restoreDeletedRecipe } from "@/server/services/recipe-service";
import { currentUserId } from "@/server/session";

const idSchema = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);

/**
 * Henter en slettet oppskrift tilbake (Story 6.11) og sender brukeren til den. Ved feil (ukjent,
 * en annens eller for gammel) blir brukeren på siden med en norsk melding. Alle sider
 * revalideres, så oppskriften vises i Oppskrifter, mapper og favoritter igjen.
 */
export async function restoreDeleted(trashId: number): Promise<ActionResult> {
  if (!idSchema.safeParse(trashId).success) return actionFailure("not_found");
  let id: number;
  try {
    const userId = await currentUserId();
    if (userId === null) return actionFailure("login_required");
    const result = restoreDeletedRecipe(userId, trashId);
    if (!result.ok) {
      // Den kan være hentet tilbake i en annen fane eller gått ut: oppdater listen.
      revalidatePath("/nylig-slettet");
      return actionFailure(result.error.kind);
    }
    id = result.value.id;
    revalidatePath("/", "layout");
  } catch (error) {
    console.error("Kunne ikke hente tilbake oppskriften", error);
    return actionFailure(undefined);
  }

  // redirect() kaster et kontrollflytunntak og må ligge utenfor try/catch.
  redirect(`/oppskrift/${id}`);
}

/** Sletter en slettet oppskrift for godt (Story 6.11). */
export async function deleteDeletedForGood(trashId: number): Promise<ActionResult> {
  if (!idSchema.safeParse(trashId).success) return actionFailure("not_found");
  try {
    const userId = await currentUserId();
    if (userId === null) return actionFailure("login_required");
    const result = deleteDeletedRecipeForGood(userId, trashId);
    if (!result.ok) {
      revalidatePath("/nylig-slettet");
      return actionFailure(result.error.kind);
    }
    revalidatePath("/nylig-slettet");
    return { ok: true };
  } catch (error) {
    console.error("Kunne ikke slette oppskriften for godt", error);
    return actionFailure(undefined);
  }
}
