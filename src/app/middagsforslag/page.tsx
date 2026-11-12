import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import DinnerSuggester from "@/components/DinnerSuggester";
import EmptyState from "@/components/EmptyState";
import LoginRequired from "@/components/LoginRequired";
import { collectionMessages, dinnerMessages as m } from "@/lib/messages";
import { listCollection } from "@/server/services/recipe-service";
import { currentUserId } from "@/server/session";
import listStyles from "../list-page.module.css";
import styles from "./page.module.css";

export const metadata: Metadata = { title: m.heading };

/**
 * Middagsforslag, `/middagsforslag` (Story 6.13). Overskriften står utenfor Suspense; data leses
 * inne i grensen, etter `connection()`, som i Oppskrifter.
 */
export default function DinnerPage() {
  return (
    <div className={`${listStyles.root} ${styles.root}`}>
      <h1>{m.heading}</h1>
      <Suspense fallback={<p className={listStyles.loading}>{m.loading}</p>}>
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
      <p className={styles.lead}>{m.lead}</p>
      <DinnerSuggester
        recipes={recipes.value.map((recipe) => ({
          id: recipe.id,
          title: recipe.title,
          totalMinutes: recipe.totalMinutes ?? null,
          isFavorite: recipe.isFavorite,
          folderName: recipe.folderName,
          rating: recipe.rating ?? null,
          labels: recipe.labels ?? [],
        }))}
      />
    </>
  );
}
