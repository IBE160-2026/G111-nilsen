"use server";

import { z } from "zod";
import {
  actionFailure,
  type ActionResult,
  type PantryActionResult,
} from "@/app/_shared/action-result";
import { pantryMessages } from "@/lib/messages";
import { addPantryItem, clearPantry, removePantryItem } from "@/server/services/pantry-service";
import { currentUserId } from "@/server/session";

// Server Actions er offentlige endepunkter: id og navn valideres på nytt her.
const idSchema = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);

/**
 * Legger noe til «Har hjemme» (Story 5.8), så det ikke står på handlelisten. Tomt eller for langt
 * navn gir en melding under feltet og lagrer ingenting. Samme navn to ganger gir den som finnes.
 */
export async function addToPantry(name: string): Promise<PantryActionResult> {
  if (typeof name !== "string")
    return { ok: false, field: "name", message: pantryMessages.nameRequired };
  try {
    const userId = await currentUserId();
    if (userId === null) return actionFailure("login_required");
    const result = addPantryItem(userId, name);
    if (!result.ok) {
      if (result.error.kind === "validation") {
        return {
          ok: false,
          field: "name",
          message:
            result.error.detail === "name_too_long"
              ? pantryMessages.nameTooLong
              : pantryMessages.nameRequired,
        };
      }
      return actionFailure(result.error.kind);
    }
    return { ok: true, item: result.value };
  } catch (error) {
    console.error("Kunne ikke legge til i «Har hjemme»", error);
    return actionFailure(undefined);
  }
}

/** Tar noe ut av «Har hjemme», så det kommer tilbake på handlelisten. */
export async function removeFromPantry(id: number): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return actionFailure("not_found");
  try {
    const userId = await currentUserId();
    if (userId === null) return actionFailure("login_required");
    const result = removePantryItem(userId, id);
    if (!result.ok) return actionFailure(result.error.kind);
    return { ok: true };
  } catch (error) {
    console.error("Kunne ikke ta ut av «Har hjemme»", error);
    return actionFailure(undefined);
  }
}

/** Tømmer «Har hjemme» etter en handletur, så alt kommer tilbake på handlelisten. */
export async function clearPantryItems(): Promise<ActionResult> {
  try {
    const userId = await currentUserId();
    if (userId === null) return actionFailure("login_required");
    const result = clearPantry(userId);
    if (!result.ok) return actionFailure(result.error.kind);
    return { ok: true };
  } catch (error) {
    console.error("Kunne ikke tømme «Har hjemme»", error);
    return actionFailure(undefined);
  }
}
