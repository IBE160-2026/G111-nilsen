"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionFailure, type ActionResult } from "@/app/_shared/action-result";
import { weekMessages } from "@/lib/messages";
import { addToWeek, removeFromWeek } from "@/server/services/meal-plan-service";
import { currentUserId } from "@/server/session";

// Server Actions er offentlige endepunkter: alt valideres på nytt her (og i tjenesten).
const idSchema = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
const addSchema = z.object({
  recipeId: z.number(),
  day: z.string(),
  servings: z.number(),
});

/** Svaret fra «Legg til» i ukemenyen: id-en til oppføringen, eller en norsk melding. */
export type AddToWeekResult = { ok: true; id: number } | { ok: false; message: string };

/** Legger en lagret oppskrift på en dag i ukemenyen (Story 6.4). */
export async function addMeal(input: {
  recipeId: number;
  day: string;
  servings: number;
}): Promise<AddToWeekResult> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success || !idSchema.safeParse(parsed.data.recipeId).success)
    return { ok: false, message: weekMessages.pickRecipe };
  try {
    const userId = await currentUserId();
    if (userId === null) return actionFailure("login_required");
    const { recipeId, day, servings } = parsed.data;
    const result = addToWeek(userId, recipeId, day, servings);
    if (!result.ok) {
      if (result.error.kind === "validation" && result.error.detail === "servings")
        return { ok: false, message: weekMessages.invalidServings };
      return actionFailure(result.error.kind);
    }
    revalidatePath("/ukemeny");
    return { ok: true, id: result.value.id };
  } catch (error) {
    console.error("Kunne ikke legge til i ukemenyen", error);
    return actionFailure(undefined);
  }
}

/** Fjerner en oppføring fra ukemenyen. */
export async function removeMeal(id: number): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return actionFailure("not_found");
  try {
    const userId = await currentUserId();
    if (userId === null) return actionFailure("login_required");
    const result = removeFromWeek(userId, id);
    if (!result.ok) return actionFailure(result.error.kind);
    revalidatePath("/ukemeny");
    return { ok: true };
  } catch (error) {
    console.error("Kunne ikke fjerne fra ukemenyen", error);
    return actionFailure(undefined);
  }
}
