"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { actionFailure, type ActionResult } from "@/app/_shared/action-result";
import { parseRecipeId } from "@/lib/recipe-id";
import { LIMITS } from "@/lib/recipe-input";
import {
  deleteRecipe,
  saveRecipeToCollection,
  setSelectedServings,
} from "@/server/services/recipe-service";

// Id og antall er bundet fra siden, men Server Actions er offentlige endepunkter og
// valideres på nytt (samme regler som `parseRecipeId` og porsjonsvelgeren).
const idSchema = z.number().refine((id) => parseRecipeId(String(id)) !== null);
const servingsSchema = z.number().int().min(LIMITS.servingsMin).max(LIMITS.servingsMax);

/**
 * Legger oppskriften i samlingen (Story 3.2). Oppskriftssiden revalideres, så lagre-linjen
 * bytter fra «Lagre» til «Slett». Feil gir en norsk melding og endrer ingenting.
 */
export async function saveRecipe(id: number): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return actionFailure("not_found");

  try {
    const result = saveRecipeToCollection(id);
    if (!result.ok) return actionFailure(result.error.kind);
    revalidatePath(`/oppskrift/${id}`);
    return { ok: true };
  } catch (error) {
    console.error("Kunne ikke lagre oppskriften i samlingen", error);
    return actionFailure(undefined);
  }
}

/**
 * Sletter oppskriften med ingredienser og steg og sender brukeren til Samlingen. Ved feil
 * returneres en norsk melding og brukeren blir på siden. Samlingen revalideres, så den
 * slettede oppskriften ikke vises fra en bevart side.
 */
export async function removeRecipe(id: number): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return actionFailure("not_found");

  try {
    const result = deleteRecipe(id);
    if (!result.ok) return actionFailure(result.error.kind);
    revalidatePath("/samlingen");
  } catch (error) {
    console.error("Kunne ikke slette oppskriften", error);
    return actionFailure(undefined);
  }

  // redirect() kaster et kontrollflytunntak og må ligge utenfor try/catch.
  redirect("/samlingen");
}

/**
 * Husker valgt antall personer for en lagret oppskrift. Kalles ved hver endring i
 * porsjonsvelgeren og revaliderer ikke (siden skal ikke lastes på nytt).
 */
export async function rememberServings(id: number, servings: number): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return actionFailure("not_found");
  if (!servingsSchema.safeParse(servings).success) return actionFailure("validation");

  try {
    const result = setSelectedServings(id, servings);
    if (!result.ok) return actionFailure(result.error.kind);
    return { ok: true };
  } catch (error) {
    console.error("Kunne ikke lagre valgt antall", error);
    return actionFailure(undefined);
  }
}
