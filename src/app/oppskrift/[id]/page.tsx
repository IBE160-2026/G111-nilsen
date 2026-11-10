import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache, Suspense } from "react";
import RecipeView from "@/components/RecipeView";
import { parseRecipeId } from "@/lib/recipe-id";
import { listFolders } from "@/server/services/folder-service";
import { getRecipeFor } from "@/server/services/recipe-service";
import { currentUserId } from "@/server/session";
import styles from "./page.module.css";

type Params = Promise<{ id: string }>;

/** Standardtittel når oppskriften ikke finnes. */
const DEFAULT_TITLE = "Oppskrift";

/**
 * Leser oppskriften én gang per forespørsel, selv om både metadata og side trenger den. En annens
 * oppskrift gir `not_found` (Story 5.13); en import uten eier kan alle med lenken se.
 */
const loadRecipe = cache(async (rawId: string) => {
  const id = parseRecipeId(rawId);
  if (id === null) return null;
  const viewer = await currentUserId();
  return { viewer, result: getRecipeFor(viewer, id) };
});

/**
 * Fanetittel «<tittel> · RecipeMate» (malen ligger i rotlayouten). Siden er uansett
 * dynamisk (Suspense + `connection()`), så metadata kan lese databasen ved forespørsel.
 */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  await connection();
  const loaded = await loadRecipe(id);
  return { title: loaded?.result.ok ? loaded.result.value.title : DEFAULT_TITLE };
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

  const loaded = await loadRecipe(id);
  if (loaded === null) notFound();
  const { viewer, result } = loaded;
  if (!result.ok) {
    if (result.error.kind === "not_found") notFound();
    // Andre feil er uventede og vises av error.tsx.
    throw new Error(`Kunne ikke hente oppskriften (${result.error.kind})`);
  }

  // Uten innlogging finnes ingen mapper, og lagre-linjen viser «Logg inn for å lagre».
  const folders = viewer === null ? { ok: true as const, value: [] } : listFolders(viewer);
  if (!folders.ok) throw new Error(`Kunne ikke hente mappene (${folders.error.kind})`);

  return <RecipeView recipe={result.value} folders={folders.value} signedIn={viewer !== null} />;
}
