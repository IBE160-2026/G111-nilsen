"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionFailure, type ActionResult } from "@/app/_shared/action-result";
import { shareMessages as m } from "@/lib/messages";
import { acceptInvitation, endShare, inviteToCollection } from "@/server/services/share-service";
import { currentUserId } from "@/server/session";

const idSchema = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);

/** Svaret fra invitasjonsskjemaet: ok med e-posten, eller en norsk melding. */
export type InviteResult = { ok: true; email: string } | { ok: false; message: string };

/** Feilmelding for invitasjon (Story 6.19); detaljen fra tjenesten velger teksten. */
function inviteMessage(kind: string, detail: string | undefined): string {
  if (kind === "not_found") return m.noAccount;
  if (kind === "duplicate") return m.alreadyInvited;
  if (detail === "self") return m.selfInvite;
  if (detail === "limit") return m.limit;
  if (detail === "email") return m.invalidEmail;
  return actionFailure(kind).message;
}

/** Inviterer en annen konto til å se samlingen (Story 6.19). */
export async function invitePerson(email: string): Promise<InviteResult> {
  try {
    const userId = await currentUserId();
    if (userId === null) return { ok: false, message: actionFailure("login_required").message };
    const result = inviteToCollection(userId, email);
    if (!result.ok) {
      return { ok: false, message: inviteMessage(result.error.kind, result.error.detail) };
    }
    revalidatePath("/delt");
    return { ok: true, email: result.value.email };
  } catch (error) {
    console.error("Kunne ikke invitere", error);
    return { ok: false, message: actionFailure("unknown").message };
  }
}

/** Godtar en invitasjon (Story 6.19). */
export async function acceptShareInvitation(id: number): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return actionFailure("not_found");
  try {
    const userId = await currentUserId();
    if (userId === null) return actionFailure("login_required");
    const result = acceptInvitation(userId, id);
    if (!result.ok) {
      revalidatePath("/delt");
      return actionFailure(result.error.kind);
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    console.error("Kunne ikke godta invitasjonen", error);
    return actionFailure("unknown");
  }
}

/** Avslutter en deling eller avslår en invitasjon (Story 6.19). Begge parter kan gjøre det. */
export async function stopSharing(id: number): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return actionFailure("not_found");
  try {
    const userId = await currentUserId();
    if (userId === null) return actionFailure("login_required");
    const result = endShare(userId, id);
    revalidatePath("/", "layout");
    return result.ok ? { ok: true } : actionFailure(result.error.kind);
  } catch (error) {
    console.error("Kunne ikke avslutte delingen", error);
    return actionFailure("unknown");
  }
}
