import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import EmptyState from "@/components/EmptyState";
import LoginRequired from "@/components/LoginRequired";
import FavoriteFeedback from "@/components/FavoriteFeedback";
import RecipeCard from "@/components/RecipeCard";
import { favoriteMessages } from "@/lib/messages";
import { listFavorites } from "@/server/services/recipe-service";
import { currentUserId } from "@/server/session";
import styles from "../list-page.module.css";

export const metadata: Metadata = { title: favoriteMessages.heading };

/** Overskriften tar imot fokus når et avmarkert kort og dets hjerte forsvinner. */
const FAVORITES_HEADING_ID = "favoritter-overskrift";

/**
 * Favoritter (Story 3.4). Overskriften står utenfor Suspense; favorittene leses inne i
 * grensen, etter `connection()`, som i Samlingen. `FavoriteFeedback` har statusområdet som
 * overlever at et kort fjernes, og flytter fokus til overskriften (`tabIndex={-1}`).
 */
export default function FavoritterPage() {
  return (
    <FavoriteFeedback headingId={FAVORITES_HEADING_ID}>
      <div className={styles.root}>
        <h1 id={FAVORITES_HEADING_ID} tabIndex={-1}>
          {favoriteMessages.heading}
        </h1>
        <Suspense fallback={<p className={styles.loading}>{favoriteMessages.loading}</p>}>
          <FavoritesLoader />
        </Suspense>
      </div>
    </FavoriteFeedback>
  );
}

async function FavoritesLoader() {
  await connection();
  const userId = await currentUserId();
  if (userId === null) return <LoginRequired next="/favoritter" />;

  const result = listFavorites(userId);
  // Feil vises av error.tsx; en tom liste skal aldri skjule en databasefeil.
  if (!result.ok) throw new Error(`${favoriteMessages.loadFailed} (${result.error.kind})`);

  if (result.value.length === 0) {
    return (
      <EmptyState
        title={favoriteMessages.emptyTitle}
        description={favoriteMessages.emptyDescription}
        action={{ href: "/oppskrifter", label: favoriteMessages.emptyAction }}
      />
    );
  }

  return (
    <ul className={styles.list} role="list">
      {result.value.map((recipe) => (
        <li key={recipe.id}>
          <RecipeCard recipe={recipe} />
        </li>
      ))}
    </ul>
  );
}
