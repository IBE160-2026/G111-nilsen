import "server-only";
import { and, eq } from "drizzle-orm";
import type { AppliedSuggestion, Suggestion, SuggestionTarget } from "@/domain";
import type { Db } from "../client";
import { recipes, suggestions } from "../schema";

/**
 * Tar et forslag i bruk for en oppskrift (Story 4.2). Samme tekst kan bare tas i bruk én gang per
 * oppskrift (unik indeks): et nytt forsøk gir den eksisterende raden. `recipes.updatedAt` røres
 * ikke, siden avkrysning på siden er nøklet på den. Returnerer `null` når oppskriften ikke finnes.
 */
export function insertAppliedSuggestion(
  db: Db,
  recipeId: number,
  suggestion: Suggestion,
  createdAt: string,
): AppliedSuggestion | null {
  return db.transaction((tx) => {
    if (!tx.select({ id: recipes.id }).from(recipes).where(eq(recipes.id, recipeId)).get()) {
      return null;
    }
    tx.insert(suggestions)
      .values({
        recipeId,
        text: suggestion.text,
        reason: suggestion.reason,
        appliesTo: suggestion.appliesTo,
        createdAt,
      })
      .onConflictDoNothing()
      .run();
    const row = tx
      .select()
      .from(suggestions)
      .where(and(eq(suggestions.recipeId, recipeId), eq(suggestions.text, suggestion.text)))
      .get();
    if (!row) return null;
    return {
      id: row.id,
      text: row.text,
      reason: row.reason,
      appliesTo: row.appliesTo as SuggestionTarget,
    };
  });
}

/**
 * Fjerner et valgt forslag. Id-en må høre til oppskriften, så en id fra en annen oppskrift
 * ikke slettes. Returnerer `false` når ingenting ble slettet.
 */
export function deleteAppliedSuggestion(db: Db, recipeId: number, suggestionId: number): boolean {
  return (
    db
      .delete(suggestions)
      .where(and(eq(suggestions.id, suggestionId), eq(suggestions.recipeId, recipeId)))
      .run().changes > 0
  );
}
