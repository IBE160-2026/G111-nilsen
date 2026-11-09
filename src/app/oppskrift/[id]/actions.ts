"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  actionFailure,
  type ActionResult,
  type FolderActionResult,
} from "@/app/_shared/action-result";
import { folderFailure, folderIdSchema, parseFolderName } from "@/app/_shared/folder-action";
import { parseRecipeId } from "@/lib/recipe-id";
import { LIMITS } from "@/lib/recipe-input";
import { moveRecipeToFolder, moveRecipeToNewFolder } from "@/server/services/folder-service";
import {
  deleteRecipe,
  saveRecipeToCollection,
  setFavorite as setFavoriteForRecipe,
  setOriginalServings,
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
    // Mappenavn, kort og telling står på flere sider (og skjulte sider beholdes av Activity).
    revalidatePath("/", "layout");
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
    revalidatePath("/", "layout");
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

/**
 * Lagrer antallet oppskriften er skrevet for (Story 2.4, FR-3), for lagret og ulagret oppskrift.
 * Sidene revalideres, så en bevart side ikke viser det gamle antallet. Feil gir en norsk melding.
 */
export async function changeOriginalServings(id: number, servings: number): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return actionFailure("not_found");
  if (!servingsSchema.safeParse(servings).success) return actionFailure("validation");

  try {
    const result = setOriginalServings(id, servings);
    if (!result.ok) return actionFailure(result.error.kind);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    console.error("Kunne ikke lagre antallet oppskriften er laget for", error);
    return actionFailure(undefined);
  }
}

/**
 * Legger en lagret oppskrift i en mappe, eller tar den ut av mappen med `null` (Story 3.3).
 * Svaret har navnet på mappen (`null` når oppskriften ikke lenger ligger i en). Alle sider
 * revalideres, siden mappenavn står på kort, i lagre-linjen og på mappesider.
 */
export async function moveToFolder(
  recipeId: number,
  folderId: number | null,
): Promise<FolderActionResult<{ folderName: string | null }>> {
  if (!idSchema.safeParse(recipeId).success) return actionFailure("not_found");
  if (folderId !== null && !folderIdSchema.safeParse(folderId).success) {
    return actionFailure("not_found");
  }

  try {
    const result = moveRecipeToFolder(recipeId, folderId);
    if (!result.ok) return folderFailure(result.error);
    revalidatePath("/", "layout");
    return { ok: true, folderName: result.value.folder?.name ?? null };
  } catch (error) {
    console.error("Kunne ikke legge oppskriften i mappen", error);
    return actionFailure(undefined);
  }
}

/**
 * Oppretter en mappe og legger oppskriften i den, i én transaksjon (Story 3.3). Ugyldig eller
 * opptatt navn gir en melding under feltet, og ingenting opprettes.
 */
export async function moveToNewFolder(
  recipeId: number,
  name: string,
): Promise<FolderActionResult<{ folderName: string }>> {
  if (!idSchema.safeParse(recipeId).success) return actionFailure("not_found");
  const parsed = parseFolderName(name);
  if (!parsed.ok) return parsed.result;

  try {
    const result = moveRecipeToNewFolder(recipeId, parsed.name);
    if (!result.ok) return folderFailure(result.error);
    revalidatePath("/", "layout");
    return { ok: true, folderName: result.value.folder.name };
  } catch (error) {
    console.error("Kunne ikke opprette mappen og legge oppskriften i den", error);
    return actionFailure(undefined);
  }
}

/**
 * Markerer eller avmarkerer en lagret oppskrift som favoritt (Story 3.4). Verdien er
 * eksplisitt, ikke «bytt», så gjentatte trykk og to faner ikke snur feil vei. Alle sider
 * revalideres, siden hjertet står på kort, i Favoritter og i lagre-linjen. Feil gir en norsk
 * melding og endrer ingenting.
 */
export async function setFavorite(recipeId: number, isFavorite: boolean): Promise<ActionResult> {
  if (!idSchema.safeParse(recipeId).success) return actionFailure("not_found");
  if (!z.boolean().safeParse(isFavorite).success) return actionFailure("validation");
  try {
    const result = setFavoriteForRecipe(recipeId, isFavorite);
    if (!result.ok) {
      // Oppskriften er borte (for eksempel slettet i en annen fane): oppdater sidene så kortet forsvinner.
      if (result.error.kind === "not_found") revalidatePath("/", "layout");
      return actionFailure(result.error.kind);
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    console.error("Kunne ikke endre favorittmarkeringen", error);
    return actionFailure(undefined);
  }
}
