import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache, Suspense } from "react";
import ManualRecipeForm from "@/components/ManualRecipeForm";
import { editRecipeMessages } from "@/lib/messages";
import { parseRecipeId } from "@/lib/recipe-id";
import { getRecipeFor } from "@/server/services/recipe-service";
import { currentUserId } from "@/server/session";
import { saveRecipeEdits } from "./actions";
import { initialValuesOf } from "./initial-values";
import styles from "./page.module.css";

type Params = Promise<{ id: string }>;

/** Leser oppskriften én gang per forespørsel, selv om både metadata og side trenger den. */
const loadRecipe = cache(async (rawId: string) => {
  const id = parseRecipeId(rawId);
  // En annens oppskrift gir `not_found` (Story 5.13).
  return id === null ? null : getRecipeFor(await currentUserId(), id);
});

/** Fanetittel «Rediger · <tittel> · RecipeMate» (malen ligger i rotlayouten). */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  await connection();
  const result = await loadRecipe(id);
  return {
    title: result?.ok
      ? `${editRecipeMessages.tabTitle} · ${result.value.title}`
      : editRecipeMessages.tabTitle,
  };
}

/**
 * Redigeringssiden (Story 3.5): samme skjema som «Legg inn selv», forhåndsutfylt.
 * Data hentes inne i Suspense-grensen, etter `connection()`, som på oppskriftssiden.
 */
export default function EditRecipePage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className={styles.loading}>Henter oppskriften …</p>}>
      <EditRecipeLoader params={params} />
    </Suspense>
  );
}

async function EditRecipeLoader({ params }: { params: Params }) {
  const { id: rawId } = await params;
  await connection();

  const result = await loadRecipe(rawId);
  if (result === null) notFound();
  if (!result.ok) {
    if (result.error.kind === "not_found") notFound();
    // Andre feil er uventede og vises av error.tsx.
    throw new Error(`Kunne ikke hente oppskriften (${result.error.kind})`);
  }

  const recipe = result.value;
  return (
    <div className={styles.root}>
      <header className={styles.intro}>
        <h1>{`${editRecipeMessages.heading} «${recipe.title}»`}</h1>
        <p className={styles.lead}>{editRecipeMessages.lead}</p>
      </header>
      <ManualRecipeForm
        key={`${recipe.id}-${recipe.updatedAt}`}
        action={saveRecipeEdits.bind(null, recipe.id)}
        initialValues={initialValuesOf(recipe)}
        submitLabel={editRecipeMessages.submit}
        cancelHref={`/oppskrift/${recipe.id}`}
      />
    </div>
  );
}
