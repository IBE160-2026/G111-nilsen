import { z } from "zod";
import type { Recipe } from "@/domain";
import type { AppError, Result } from "@/lib/result";

/** Grenser for en oversettelse (Story 6.36b); like romslige som for å legge inn selv. */
export const TRANSLATION_LIMITS = {
  title: 200,
  line: 300,
  step: 2000,
  lines: 100,
  sectionName: 100,
} as const;

/** Skjemaet for det en leverandør gir tilbake. Ukjente felt fjernes; alt annet avvises. */
export const translationSchema = z.object({
  title: z.string().trim().min(1).max(TRANSLATION_LIMITS.title),
  ingredients: z
    .array(z.string().trim().min(1).max(TRANSLATION_LIMITS.line))
    .max(TRANSLATION_LIMITS.lines),
  steps: z
    .array(z.string().trim().min(1).max(TRANSLATION_LIMITS.step))
    .max(TRANSLATION_LIMITS.lines),
  sections: z
    .record(z.string(), z.string().trim().min(1).max(TRANSLATION_LIMITS.sectionName))
    .default({}),
});

/**
 * Port for oversettelse (Story 6.36b): eneste vei til en norsk versjon. Det finnes ingen mock, siden
 * en falsk oversettelse ville vært villedende; uten nøkkel er oversettelse ikke slått på. Svaret er
 * uvalidert; servicen kjører `translationSchema` og sjekker antallet linjer. Porten kaster aldri.
 */
export interface TranslationProvider {
  translate(recipe: Recipe): Promise<Result<unknown, AppError>>;
}
