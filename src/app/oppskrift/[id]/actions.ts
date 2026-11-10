"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  actionFailure,
  type ActionResult,
  type ApplySuggestionActionResult,
  type FolderActionResult,
  type SuggestionsActionResult,
} from "@/app/_shared/action-result";
import { folderFailure, folderIdSchema, parseFolderName } from "@/app/_shared/folder-action";
import { recipeTimeMessages } from "@/lib/messages";
import { parseRecipeId } from "@/lib/recipe-id";
import { isSelectedServings, LIMITS } from "@/lib/recipe-input";
import { moveRecipeToFolder, moveRecipeToNewFolder } from "@/server/services/folder-service";
import { refreshTimeFromSource } from "@/server/services/import-service";
import { currentUserId } from "@/server/session";
import {
  canAccessRecipe,
  deleteRecipe,
  saveRecipeToCollection,
  setFavorite as setFavoriteForRecipe,
  setOriginalServings,
  setSelectedServings,
} from "@/server/services/recipe-service";
import {
  applySuggestion as applySuggestionToRecipe,
  getSuggestions,
  removeAppliedSuggestion,
} from "@/server/services/suggestion-service";

// Id og antall er bundet fra siden, men Server Actions er offentlige endepunkter og
// valideres på nytt (samme regler som `parseRecipeId` og porsjonsvelgeren).
const idSchema = z.number().refine((id) => parseRecipeId(String(id)) !== null);
const servingsSchema = z.number().int().min(LIMITS.servingsMin).max(LIMITS.servingsMax);
// Valgt antall kan også være halvt (Story 5.1); antallet oppskriften er skrevet for er heltall.
const selectedServingsSchema = z.number().refine(isSelectedServings);

/**
 * Om den innloggede brukeren (eller en uten innlogging) kan endre oppskriften (Story 5.13). En
 * annens oppskrift behandles som ukjent, så man ikke kan se at den finnes.
 */
async function mayChange(id: number): Promise<boolean> {
  return canAccessRecipe(await currentUserId(), id);
}

/**
 * Legger oppskriften i samlingen (Story 3.2). Oppskriftssiden revalideres, så lagre-linjen
 * bytter fra «Lagre» til «Slett». `servings` er antallet brukeren har valgt (valgfritt, issue 009).
 * Feil gir en norsk melding og endrer ingenting.
 */
export async function saveRecipe(id: number, servings?: number): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return actionFailure("not_found");
  const userId = await currentUserId();
  if (userId === null) return actionFailure("login_required");

  try {
    const result = saveRecipeToCollection(userId, id);
    if (!result.ok) return actionFailure(result.error.kind);
    // Antallet brukeren valgte før lagring huskes nå (issue 009). Feil her stopper ikke lagringen.
    if (servings !== undefined && selectedServingsSchema.safeParse(servings).success) {
      const remembered = setSelectedServings(id, servings);
      if (!remembered.ok) console.error("Kunne ikke lagre valgt antall ved lagring", remembered);
    }
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
    if (!(await mayChange(id))) return actionFailure("not_found");
    const result = deleteRecipe(id);
    if (!result.ok) return actionFailure(result.error.kind);
    revalidatePath("/", "layout");
  } catch (error) {
    console.error("Kunne ikke slette oppskriften", error);
    return actionFailure(undefined);
  }

  // redirect() kaster et kontrollflytunntak og må ligge utenfor try/catch.
  redirect("/oppskrifter");
}

/**
 * Husker valgt antall personer for en lagret oppskrift. Kalles ved hver endring i
 * porsjonsvelgeren og revaliderer ikke (siden skal ikke lastes på nytt).
 */
export async function rememberServings(id: number, servings: number): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return actionFailure("not_found");
  if (!selectedServingsSchema.safeParse(servings).success) return actionFailure("validation");
  try {
    if (!(await mayChange(id))) return actionFailure("not_found");
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
    if (!(await mayChange(id))) return actionFailure("not_found");
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
  const userId = await currentUserId();
  if (userId === null) return actionFailure("login_required");

  try {
    const result = moveRecipeToFolder(userId, recipeId, folderId);
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
  const userId = await currentUserId();
  if (userId === null) return actionFailure("login_required");

  try {
    const result = moveRecipeToNewFolder(userId, recipeId, parsed.name);
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
    // En annens oppskrift behandles som en ukjent (slettet) oppskrift.
    const result = (await mayChange(recipeId))
      ? setFavoriteForRecipe(recipeId, isFavorite)
      : ({ ok: false, error: { kind: "not_found" } } as const);
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

/**
 * Henter 1–3 forslag til oppskriften (Story 4.1, FR-10). Leser bare; ingenting lagres og ingen
 * sider revalideres. Feil (ukjent oppskrift, ugyldig svar, databasefeil) gir `ok: false`, og
 * komponenten viser meldingen fra `messages.ts`, så resten av siden virker.
 */
export async function requestSuggestions(id: number): Promise<SuggestionsActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false };

  try {
    if (!(await mayChange(id))) return { ok: false };
    const result = await getSuggestions(id);
    if (!result.ok) return { ok: false };
    return { ok: true, ...result.value };
  } catch (error) {
    console.error("Kunne ikke hente forslag", error);
    return { ok: false };
  }
}

/**
 * Tar et forslag i bruk og lagrer det med oppskriften (Story 4.2, FR-11). Id og forslag valideres
 * på nytt (endepunktet er offentlig). Sidene revalideres, så en ny åpning viser det lagrede.
 * Lagrede ingredienser og steg endres ikke; forslaget vises i listene, merket «Forslag» (Story 5.11).
 * Feil gir en norsk melding og lagrer ingenting.
 */
export async function applySuggestion(
  recipeId: number,
  suggestion: unknown,
): Promise<ApplySuggestionActionResult> {
  if (!idSchema.safeParse(recipeId).success) return actionFailure("not_found");
  try {
    if (!(await mayChange(recipeId))) return actionFailure("not_found");
    const result = applySuggestionToRecipe(recipeId, suggestion);
    if (!result.ok) return actionFailure(result.error.kind);
    revalidatePath("/", "layout");
    return { ok: true, suggestion: result.value };
  } catch (error) {
    console.error("Kunne ikke ta i bruk forslaget", error);
    return actionFailure(undefined);
  }
}

/** Fjerner et valgt forslag fra oppskriften (Story 4.2). Feil gir en norsk melding og endrer ingenting. */
export async function removeSuggestion(
  recipeId: number,
  suggestionId: number,
): Promise<ActionResult> {
  if (!idSchema.safeParse(recipeId).success) return actionFailure("not_found");
  if (!idSchema.safeParse(suggestionId).success) return actionFailure("not_found");
  try {
    const result = (await mayChange(recipeId))
      ? removeAppliedSuggestion(recipeId, suggestionId)
      : ({ ok: false, error: { kind: "not_found" } } as const);
    if (!result.ok) {
      // Forslaget er borte (for eksempel fjernet i en annen fane): oppdater sidene.
      if (result.error.kind === "not_found") revalidatePath("/", "layout");
      return actionFailure(result.error.kind);
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    console.error("Kunne ikke fjerne forslaget", error);
    return actionFailure(undefined);
  }
}

/**
 * Henter tiden fra kilden på nytt (Story 6.2) for en importert oppskrift uten tid. Siden
 * revalideres ved suksess, så tiden vises ved hjertet og under tittelen. Ingen tid på siden gir
 * en egen melding; andre feil gir meldingen for feiltypen.
 */
export async function fetchTimeFromSource(id: number): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return actionFailure("not_found");
  try {
    if (!(await mayChange(id))) return actionFailure("not_found");
    const result = await refreshTimeFromSource(id);
    if (!result.ok) {
      if (result.error.detail === "no_time")
        return { ok: false, message: recipeTimeMessages.notFound };
      return actionFailure(result.error.kind);
    }
  } catch (error) {
    console.error("Kunne ikke hente tid fra kilden", error);
    return actionFailure("unknown");
  }
  revalidatePath(`/oppskrift/${id}`);
  revalidatePath("/oppskrifter");
  return { ok: true };
}
