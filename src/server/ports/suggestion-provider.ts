import { z } from "zod";
import type { Recipe } from "@/domain";
import type { AppError, Result } from "@/lib/result";

/** Grenser for ett forslag. Holder kortene lesbare og gir språkmodellen en tydelig ramme. */
export const SUGGESTION_LIMITS = {
  min: 1,
  max: 3,
  textLength: 300,
  reasonLength: 400,
} as const;

/** Skjemaet `Suggestion` (AD-5): forslag, begrunnelse og hvilken del av oppskriften det gjelder. */
export const suggestionSchema = z.object({
  text: z.string().trim().min(1).max(SUGGESTION_LIMITS.textLength),
  reason: z.string().trim().min(1).max(SUGGESTION_LIMITS.reasonLength),
  appliesTo: z.enum(["ingredients", "steps", "recipe"]),
});

/** 1–3 forslag. Ukjente felt fjernes; alt annet avvises. */
export const suggestionsSchema = z
  .array(suggestionSchema)
  .min(SUGGESTION_LIMITS.min)
  .max(SUGGESTION_LIMITS.max);

/**
 * Det en leverandør gir tilbake. `suggestions` er ikke validert ennå: servicen kjører
 * `suggestionsSchema` på alt før det vises, uansett hvilken leverandør som ga det.
 */
export type RawSuggestions = { suggestions: unknown; isExample: boolean };

/**
 * Port for forslag (AD-5): eneste vei til forslag. Mock er standard (uten nøkkel), og
 * språkmodell-adapteren kommer i Story 4.3. Porten kaster aldri; feil er `suggestion_failed`.
 */
export interface SuggestionProvider {
  suggest(recipe: Recipe): Promise<Result<RawSuggestions, AppError>>;
}
