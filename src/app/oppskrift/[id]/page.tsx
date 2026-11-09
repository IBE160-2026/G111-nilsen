import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import RecipeView from "@/components/RecipeView";
import { parseRecipeId } from "@/lib/recipe-id";
import { getRecipe } from "@/server/services/recipe-service";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Oppskrift" };

type Params = Promise<{ id: string }>;

/**
 * Enkel visning av en oppskrift (Story 1.4). Fast format, porsjonsvelger og
 * avkrysning kommer i Story 1.5–1.6. Data hentes inne i Suspense-grensen, etter
 * `connection()`, slik at databasen bare leses ved en faktisk forespørsel.
 */
export default function RecipePage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className={styles.loading}>Henter oppskriften …</p>}>
      <RecipeLoader params={params} />
    </Suspense>
  );
}

async function RecipeLoader({ params }: { params: Params }) {
  const { id: rawId } = await params;
  await connection();

  const id = parseRecipeId(rawId);
  if (id === null) notFound();

  const result = getRecipe(id);
  if (!result.ok) notFound();

  return <RecipeView recipe={result.value} />;
}
