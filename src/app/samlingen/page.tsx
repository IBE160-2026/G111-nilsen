import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import EmptyState from "@/components/EmptyState";
import RecipeCard from "@/components/RecipeCard";
import { collectionMessages } from "@/lib/messages";
import { listCollection } from "@/server/services/recipe-service";
import listStyles from "../list-page.module.css";

export const metadata: Metadata = { title: collectionMessages.heading };

/**
 * Oppskrifter-siden, `/samlingen` (Story 3.1). Overskriften står utenfor Suspense; oppskriftene leses inne i
 * grensen, etter `connection()`, slik at databasen bare leses ved en faktisk forespørsel.
 */
export default function SamlingenPage() {
  return (
    <div className={listStyles.root}>
      <h1>{collectionMessages.heading}</h1>
      <Suspense fallback={<p className={listStyles.loading}>{collectionMessages.loading}</p>}>
        <CollectionLoader />
      </Suspense>
    </div>
  );
}

async function CollectionLoader() {
  await connection();

  const result = listCollection();
  // Feil vises av error.tsx; en tom samling skal aldri skjule en databasefeil.
  if (!result.ok) throw new Error(`${collectionMessages.loadFailed} (${result.error.kind})`);

  if (result.value.length === 0) {
    return (
      <EmptyState
        title={collectionMessages.emptyTitle}
        description={collectionMessages.emptyDescription}
        action={{ href: "/ny", label: collectionMessages.emptyManualAction }}
        secondaryAction={{ href: "/", label: collectionMessages.emptyImportAction }}
      />
    );
  }

  return (
    <ul className={listStyles.list} role="list">
      {result.value.map((recipe) => (
        <li key={recipe.id}>
          <RecipeCard recipe={recipe} />
        </li>
      ))}
    </ul>
  );
}
