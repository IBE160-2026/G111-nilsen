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
import {
  labelMessages,
  messageFor,
  notesMessages,
  recipeTimeMessages,
  shareMessages,
  variantMessages,
} from "@/lib/messages";
import { parseRecipeId } from "@/lib/recipe-id";
import { isSelectedServings, LIMITS } from "@/lib/recipe-input";
import { moveRecipeToFolder, moveRecipeToNewFolder } from "@/server/services/folder-service";
import { refreshTimeFromSource } from "@/server/services/import-service";
import { currentUserId } from "@/server/session";
import {
  addRecipeLabel,
  canAccessRecipe,
  copyRecipeAsVariant,
  deleteRecipe,
  markRecipeCooked,
  removeRecipeLabel,
  setRecipeFitsFor,
  setRecipeRating,
  setRecipeNotes,
  saveRecipeToCollection,
  setFavorite as setFavoriteForRecipe,
  setOriginalServings,
  setSelectedServings,
  copySharedRecipe,
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
 * Sletter oppskriften og sender brukeren til Samlingen (Story 6.11: en lagret oppskrift legges i
 * «Nylig slettet» i 7 dager, og Samlingen viser «Angre»). Ved feil
 * returneres en norsk melding og brukeren blir på siden. Samlingen revalideres, så den
 * slettede oppskriften ikke vises fra en bevart side.
 */
export async function removeRecipe(id: number): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return actionFailure("not_found");
  let trashId: number | null;
  try {
    if (!(await mayChange(id))) return actionFailure("not_found");
    const result = deleteRecipe(id);
    if (!result.ok) return actionFailure(result.error.kind);
    trashId = result.value.trashId;
    revalidatePath("/", "layout");
  } catch (error) {
    console.error("Kunne ikke slette oppskriften", error);
    return actionFailure(undefined);
  }

  // redirect() kaster et kontrollflytunntak og må ligge utenfor try/catch. En lagret oppskrift
  // ligger nå i «Nylig slettet», og Oppskrifter viser «Angre» (Story 6.11).
  redirect(trashId === null ? "/oppskrifter" : `/oppskrifter?slettet=${trashId}`);
}

/**
 * Lager en egen variant av en lagret oppskrift og sender brukeren til redigeringssiden for
 * kopien, så tittelen kan endres med en gang (Story 6.10). Ved feil blir brukeren på siden med
 * en norsk melding. Oppskrifter er endret, så alle sider revalideres.
 */
export async function copyRecipeToVariant(id: number): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return actionFailure("not_found");
  let newId: number;
  try {
    if (!(await mayChange(id))) return actionFailure("not_found");
    const result = copyRecipeAsVariant(id, variantMessages.titlePrefix);
    if (!result.ok) return actionFailure(result.error.kind);
    newId = result.value.id;
    revalidatePath("/", "layout");
  } catch (error) {
    console.error("Kunne ikke lage en variant av oppskriften", error);
    return actionFailure(undefined);
  }

  // redirect() kaster et kontrollflytunntak og må ligge utenfor try/catch.
  redirect(`/oppskrift/${newId}/rediger`);
}

/**
 * Husker valgt antall porsjoner for en lagret oppskrift. Kalles ved hver endring i
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

/**
 * Lagrer notatene på en lagret oppskrift (Story 6.3). For lang tekst gir egen melding. Siden
 * revalideres ikke (notatene står i feltet allerede), så avkrysning og valgt antall består.
 */
export async function saveNotes(id: number, notes: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return actionFailure("not_found");
  if (typeof notes !== "string") return actionFailure("validation");
  try {
    if (!(await mayChange(id))) return actionFailure("not_found");
    const result = setRecipeNotes(id, notes);
    if (!result.ok) {
      return result.error.detail === "notes"
        ? { ok: false, message: notesMessages.tooLong }
        : actionFailure(result.error.kind);
    }
    return { ok: true };
  } catch (error) {
    console.error("Kunne ikke lagre notatene", error);
    return actionFailure("unknown");
  }
}

/** Lagrer «Passer til» på en lagret oppskrift. For lang tekst gir egen melding. */
export async function saveFitsFor(id: number, fitsFor: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return actionFailure("not_found");
  if (typeof fitsFor !== "string") return actionFailure("validation");
  try {
    if (!(await mayChange(id))) return actionFailure("not_found");
    const result = setRecipeFitsFor(id, fitsFor);
    if (!result.ok) {
      return result.error.detail === "fitsFor"
        ? { ok: false, message: notesMessages.fitsForTooLong }
        : actionFailure(result.error.kind);
    }
    return { ok: true };
  } catch (error) {
    console.error("Kunne ikke lagre «Passer til»", error);
    return actionFailure("unknown");
  }
}

/** Lagrer egen vurdering, 1–5 stjerner eller `null` for ingen (Story 6.8). */
export async function saveRating(id: number, rating: number | null): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return actionFailure("not_found");
  if (rating !== null && !(Number.isInteger(rating) && rating >= 1 && rating <= 5))
    return actionFailure("validation");
  try {
    if (!(await mayChange(id))) return actionFailure("not_found");
    const result = setRecipeRating(id, rating);
    if (!result.ok) return actionFailure(result.error.kind);
    revalidatePath("/oppskrifter");
    return { ok: true };
  } catch (error) {
    console.error("Kunne ikke lagre vurderingen", error);
    return actionFailure("unknown");
  }
}

/** «Laget i dag» (Story 6.3). Svarer med ny dato og antall, så komponenten kan vise dem. */
export async function markCookedToday(
  id: number,
): Promise<
  { ok: true; lastCookedAt: string; cookedCount: number } | { ok: false; message: string }
> {
  if (!idSchema.safeParse(id).success) return actionFailure("not_found");
  try {
    if (!(await mayChange(id))) return actionFailure("not_found");
    const result = markRecipeCooked(id);
    if (!result.ok) return actionFailure(result.error.kind);
    revalidatePath("/oppskrifter");
    return { ok: true, ...result.value };
  } catch (error) {
    console.error("Kunne ikke merke oppskriften som laget", error);
    return actionFailure("unknown");
  }
}

/** Svaret fra merkelapp-handlingene: alle merkelappene etterpå, eller en norsk melding. */
export type LabelActionResult = { ok: true; labels: string[] } | { ok: false; message: string };

/** Legger en merkelapp på en lagret oppskrift (Story 6.7). */
export async function addLabel(id: number, label: string): Promise<LabelActionResult> {
  if (!idSchema.safeParse(id).success) return actionFailure("not_found");
  if (typeof label !== "string") return { ok: false, message: labelMessages.required };
  try {
    if (!(await mayChange(id))) return actionFailure("not_found");
    const result = addRecipeLabel(id, label);
    if (!result.ok) {
      if (result.error.kind === "validation") {
        const detail = result.error.detail;
        if (detail === "label_required") return { ok: false, message: labelMessages.required };
        if (detail === "label_too_long") return { ok: false, message: labelMessages.tooLong };
        if (detail === "limit") return { ok: false, message: labelMessages.limit };
      }
      return actionFailure(result.error.kind);
    }
    revalidatePath("/oppskrifter");
    return { ok: true, labels: result.value.labels };
  } catch (error) {
    console.error("Kunne ikke legge til merkelappen", error);
    return actionFailure("unknown");
  }
}

/** Tar en merkelapp av en oppskrift (Story 6.7). */
export async function removeLabel(id: number, label: string): Promise<LabelActionResult> {
  if (!idSchema.safeParse(id).success) return actionFailure("not_found");
  if (typeof label !== "string") return actionFailure("validation");
  try {
    if (!(await mayChange(id))) return actionFailure("not_found");
    const result = removeRecipeLabel(id, label);
    if (!result.ok) return actionFailure(result.error.kind);
    revalidatePath("/oppskrifter");
    return { ok: true, labels: result.value.labels };
  } catch (error) {
    console.error("Kunne ikke fjerne merkelappen", error);
    return actionFailure("unknown");
  }
}

/** Svaret fra «Kopier til min samling» (Story 6.19). */
export type CopySharedResult = { ok: true; id: number } | { ok: false; message: string };

/**
 * Kopierer en oppskrift fra en delt samling til din egen (Story 6.19). Uten lesetilgang, eller på
 * din egen oppskrift, svarer den som om den ikke finnes.
 */
export async function copySharedToMine(id: number): Promise<CopySharedResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, message: messageFor("not_found").title };
  try {
    const userId = await currentUserId();
    if (userId === null) return { ok: false, message: actionFailure("login_required").message };
    const result = copySharedRecipe(userId, id, shareMessages.copyPrefix);
    if (!result.ok) return { ok: false, message: actionFailure(result.error.kind).message };
    revalidatePath("/", "layout");
    return { ok: true, id: result.value.id };
  } catch (error) {
    console.error("Kunne ikke kopiere oppskriften", error);
    return { ok: false, message: actionFailure("unknown").message };
  }
}
