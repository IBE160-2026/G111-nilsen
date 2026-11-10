import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import EmptyState from "@/components/EmptyState";
import CollectionBrowser from "@/components/CollectionBrowser";
import { collectionMessages, shoppingMessages, weekMessages } from "@/lib/messages";
import LoginRequired from "@/components/LoginRequired";
import { listCollection } from "@/server/services/recipe-service";
import { currentUserId } from "@/server/session";
import listStyles from "../list-page.module.css";
import styles from "./page.module.css";

export const metadata: Metadata = { title: collectionMessages.heading };

/**
 * Oppskrifter-siden, `/oppskrifter` (Story 3.1). Overskriften står utenfor Suspense; oppskriftene leses inne i
 * grensen, etter `connection()`, slik at databasen bare leses ved en faktisk forespørsel.
 */
export default function SamlingenPage() {
  return (
    <div className={listStyles.root}>
      <div className={styles.titleRow}>
        <h1>{collectionMessages.heading}</h1>
        <div className={styles.titleLinks}>
          <Link href="/ukemeny" className={styles.titleLink}>
            {weekMessages.link}
          </Link>
          <Link href="/handleliste" className={styles.titleLink}>
            {shoppingMessages.link}
          </Link>
        </div>
      </div>
      <Suspense fallback={<p className={listStyles.loading}>{collectionMessages.loading}</p>}>
        <CollectionLoader />
      </Suspense>
    </div>
  );
}

async function CollectionLoader() {
  await connection();
  const userId = await currentUserId();
  if (userId === null) return <LoginRequired next="/oppskrifter" />;

  const result = listCollection(userId);
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

  return <CollectionBrowser entries={result.value} />;
}
