"use server";

import { z } from "zod";
import {
  actionFailure,
  type ActionResult,
  type PantryActionResult,
} from "@/app/_shared/action-result";
import { revalidatePath } from "next/cache";
import { pantryMessages, shoppingMessages } from "@/lib/messages";
import { addPantryItem, clearPantry, removePantryItem } from "@/server/services/pantry-service";
import { setCheck } from "@/server/services/meal-plan-service";
import {
  removeSavedList,
  saveSavedList,
  LIST_RECIPES_MAX,
} from "@/server/services/shopping-list-service";
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

/** Krysser av eller fjerner avkrysningen for en vare i handlelisten for en uke (Story 6.4c). */
export async function setWeekItemChecked(
  week: string,
  key: string,
  checked: boolean,
): Promise<ActionResult> {
  try {
    const userId = await currentUserId();
    if (userId === null) return actionFailure("login_required");
    const result = setCheck(userId, week, key, checked);
    if (!result.ok) return actionFailure(result.error.kind);
    return { ok: true };
  } catch (error) {
    console.error("Kunne ikke lagre avkrysningen", error);
    return actionFailure(undefined);
  }
}

const saveSchema = z.object({
  name: z.string().max(500),
  items: z.array(z.object({ recipeId: z.number(), servings: z.number() })).max(LIST_RECIPES_MAX),
});

/** Svaret fra «Lagre handlelisten»: ok med listens id, eller en melding. */
export type SaveListResult =
  { ok: true; id: number; name: string } | { ok: false; message: string };

/**
 * Lagrer valgte oppskrifter og porsjoner som en handleliste med navn (Story 6.4g). Samme navn
 * erstatter den som finnes. Ugyldig navn, antall eller utvalg gir en melding og lagrer ingenting.
 */
export async function saveShoppingList(input: {
  name: string;
  items: { recipeId: number; servings: number }[];
}): Promise<SaveListResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return actionFailure("validation");
  try {
    const userId = await currentUserId();
    if (userId === null) return actionFailure("login_required");
    const result = saveSavedList(userId, parsed.data.name, parsed.data.items);
    if (!result.ok) {
      if (result.error.kind === "validation") {
        const message =
          result.error.detail === "name_required"
            ? shoppingMessages.nameRequired
            : result.error.detail === "name_too_long"
              ? shoppingMessages.nameTooLong
              : result.error.detail === "items"
                ? shoppingMessages.saveNothing
                : result.error.detail === "limit"
                  ? shoppingMessages.limitReached
                  : null;
        if (message !== null) return { ok: false, message };
      }
      return actionFailure(result.error.kind);
    }
    revalidatePath("/handleliste");
    return { ok: true, id: result.value.id, name: parsed.data.name.replace(/\s+/g, " ").trim() };
  } catch (error) {
    console.error("Kunne ikke lagre handlelisten", error);
    return actionFailure(undefined);
  }
}

/** Sletter en lagret handleliste (Story 6.4g). */
export async function deleteShoppingList(id: number): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return actionFailure("not_found");
  try {
    const userId = await currentUserId();
    if (userId === null) return actionFailure("login_required");
    const result = removeSavedList(userId, id);
    if (!result.ok) return actionFailure(result.error.kind);
    revalidatePath("/handleliste");
    return { ok: true };
  } catch (error) {
    console.error("Kunne ikke slette handlelisten", error);
    return actionFailure(undefined);
  }
}
