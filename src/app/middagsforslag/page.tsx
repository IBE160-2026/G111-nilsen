import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import DinnerSuggester from "@/components/DinnerSuggester";
import EmptyState from "@/components/EmptyState";
import LoginRequired from "@/components/LoginRequired";
import { collectionMessages, dinnerMessages as m } from "@/lib/messages";
import { listCollection } from "@/server/services/recipe-service";
import { currentUserId } from "@/server/session";
import styles from "../list-page.module.css";

export const metadata: Metadata = { title: m.heading };

/**
 * Middagsforslag, `/middagsforslag` (Story 6.13). Overskriften står utenfor Suspense; data leses
 * inne i grensen, etter `connection()`, som i Oppskrifter.
 */
export default function DinnerPage() {
  return (
    <div className={styles.root}>
      <h1>{m.heading}</h1>
      <Suspense fallback={<p className={styles.loading}>{m.loading}</p>}>
        <DinnerLoader />
      </Suspense>
    </div>
  );
}

async function DinnerLoader() {
  await connection();
  const userId = await currentUserId();
  if (userId === null) return <LoginRequired next="/middagsforslag" />;

  const recipes = listCollection(userId);
  if (!recipes.ok) throw new Error(`${m.loadFailed} (${recipes.error.kind})`);

  if (recipes.value.length === 0) {
    return (
      <EmptyState
        title={collectionMessages.emptyTitle}
        description={collectionMessages.emptyDescription}
        action={{ href: "/ny", label: collectionMessages.emptyManualAction }}
        secondaryAction={{ href: "/importer", label: collectionMessages.emptyImportAction }}
      />
    );
  }

  return (
    <>
      <p>{m.lead}</p>
      <DinnerSuggester
        recipes={recipes.value.map((recipe) => ({
          id: recipe.id,
          title: recipe.title,
          totalMinutes: recipe.totalMinutes ?? null,
          isFavorite: recipe.isFavorite,
        }))}
      />
    </>
  );
}
