"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ImportFailure, ImportFormState } from "@/app/_shared/import-form";
import { messageFor } from "@/lib/messages";
import { parseRecipeId } from "@/lib/recipe-id";
import { appError, type AppError } from "@/lib/result";
import { importRecipe } from "@/server/services/import-service";
import { currentUserId } from "@/server/session";

// Server Actions er offentlige endepunkter: inputen valideres på nytt. Grensen er romslig nok til
// at `validateUrl` kan trimme og gi sin egen melding; selve lenken kan maks være 2048 tegn.
const urlSchema = z.string().max(10_000);

function failure(error: AppError): ImportFailure {
  const message = messageFor(error.kind);
  const recipeId = error.kind === "duplicate" ? parseRecipeId(error.detail ?? "") : null;
  return {
    ok: false,
    kind: error.kind,
    title: message.title,
    body: message.body,
    ...(recipeId === null ? {} : { recipeId }),
  };
}

/**
 * Importerer en oppskrift fra en lenke (AD-3, AD-4). Ved suksess revalideres sidene og brukeren
 * sendes til oppskriften (`redirect` kaster og ligger utenfor try/catch). Ved feil returneres en
 * norsk melding; uventede feil gir reservemeldingen og logges. Kaster aldri til klienten.
 */
export async function importFromUrl(url: string): Promise<ImportFailure> {
  const parsed = urlSchema.safeParse(url);
  if (!parsed.success) return failure(appError("invalid_url"));

  let id: number;
  try {
    // Innlogget: importen blir brukerens. Uten innlogging har den ingen eier (Story 5.13).
    const result = await importRecipe(parsed.data, { userId: await currentUserId() });
    if (!result.ok) return failure(result.error);
    id = result.value.id;
  } catch (error) {
    console.error("Kunne ikke importere oppskriften", error);
    return failure(appError("unknown"));
  }
  // Oppskriften er lagret: en feil ved revalidering skal ikke gi brukeren en importfeil.
  try {
    revalidatePath("/", "layout");
  } catch (error) {
    console.error("Kunne ikke revalidere etter import", error);
  }
  redirect(`/oppskrift/${id}`);
}

/**
 * Skjemaversjonen av `importFromUrl` for `useActionState`: leser feltet `url`, og svarer med
 * tilstanden der lenken står igjen sammen med eventuell feil. Virker også uten JavaScript.
 */
export async function submitImport(
  previous: ImportFormState,
  formData: FormData,
): Promise<ImportFormState> {
  const raw = formData.get("url");
  const url = typeof raw === "string" ? raw : "";
  const error = await importFromUrl(url);
  return { url: url.slice(0, 10_000), error, attempt: previous.attempt + 1 };
}
