import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache, Suspense } from "react";
import RecipeView from "@/components/RecipeView";
import { parseRecipeId } from "@/lib/recipe-id";
import { getRecipe } from "@/server/services/recipe-service";
import styles from "./page.module.css";

type Params = Promise<{ id: string }>;

/** Standardtittel når oppskriften ikke finnes. */
const DEFAULT_TITLE = "Oppskrift";

/** Leser oppskriften én gang per forespørsel, selv om både metadata og side trenger den. */
const loadRecipe = cache((rawId: string) => {
  const id = parseRecipeId(rawId);
  return id === null ? null : getRecipe(id);
});

/**
 * Fanetittel «<tittel> · RecipeMate» (malen ligger i rotlayouten). Siden er uansett
 * dynamisk (Suspense + `connection()`), så metadata kan lese databasen ved forespørsel.
 */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  await connection();
  const result = loadRecipe(id);
  return { title: result?.ok ? result.value.title : DEFAULT_TITLE };
}

/**
 * Oppskriftssiden (Story 1.4–1.5). Data hentes inne i Suspense-grensen, etter
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
  const { id } = await params;
  await connection();

  const result = loadRecipe(id);
  if (!result?.ok) notFound();

  return <RecipeView recipe={result.value} />;
}
