"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionFailure, type ActionResult } from "@/app/_shared/action-result";
import { weekMessages } from "@/lib/messages";
import { saveWeek, WEEK_ENTRIES_MAX } from "@/server/services/meal-plan-service";
import { currentUserId } from "@/server/session";

// Server Actions er offentlige endepunkter: alt valideres på nytt her (og i tjenesten).
const saveSchema = z.object({
  week: z.string(),
  items: z
    .array(z.object({ recipeId: z.number(), day: z.string(), servings: z.number() }))
    .max(WEEK_ENTRIES_MAX),
});

/**
 * Lagrer ukemenyen for en uke (Story 6.4): alle oppføringene i uka erstattes med `items`. Svarer
 * med en norsk melding ved feil, og endrer da ingenting.
 */
export async function saveWeekPlan(input: {
  week: string;
  items: { recipeId: number; day: string; servings: number }[];
}): Promise<ActionResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return actionFailure("validation");
  try {
    const userId = await currentUserId();
    if (userId === null) return actionFailure("login_required");
    const result = saveWeek(userId, parsed.data.week, parsed.data.items);
    if (!result.ok) {
      if (result.error.kind === "validation" && result.error.detail === "servings")
        return { ok: false, message: weekMessages.invalidServings };
      return actionFailure(result.error.kind);
    }
    revalidatePath("/ukemeny");
    revalidatePath("/ukemeny/uker");
    return { ok: true };
  } catch (error) {
    console.error("Kunne ikke lagre ukemenyen", error);
    return actionFailure(undefined);
  }
}
