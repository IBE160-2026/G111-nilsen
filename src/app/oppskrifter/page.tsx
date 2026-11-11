import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import EmptyState from "@/components/EmptyState";
import CollectionBrowser from "@/components/CollectionBrowser";
import {
  collectionMessages,
  shoppingMessages,
  trashMessages,
  whatToCookMessages,
} from "@/lib/messages";
import UndoDeleteBanner from "@/components/UndoDeleteBanner";
import LoginRequired from "@/components/LoginRequired";
import { getDeletedRecipe, listCollection } from "@/server/services/recipe-service";
import { restoreDeleted } from "../nylig-slettet/actions";
import { currentUserId } from "@/server/session";
import listStyles from "../list-page.module.css";
import styles from "./page.module.css";

export const metadata: Metadata = { title: collectionMessages.heading };

/**
 * Oppskrifter-siden, `/oppskrifter` (Story 3.1). Overskriften står utenfor Suspense; oppskriftene leses inne i
 * grensen, etter `connection()`, slik at databasen bare leses ved en faktisk forespørsel.
 */
type SearchParams = Promise<{ slettet?: string | string[] }>;

export default function SamlingenPage({
  searchParams = Promise.resolve({}),
}: { searchParams?: SearchParams } = {}) {
  return (
    <div className={listStyles.root}>
      <div className={styles.titleRow}>
        <h1>{collectionMessages.heading}</h1>
        <span className={styles.titleLinks}>
          <Link href="/hva-kan-jeg-lage" className={styles.titleLink}>
            {whatToCookMessages.link}
          </Link>
          <Link href="/nylig-slettet" className={styles.titleLink}>
            {trashMessages.link}
          </Link>
          <Link href="/handleliste" className={styles.titleLink}>
            {shoppingMessages.link}
          </Link>
        </span>
      </div>
      <Suspense fallback={<p className={listStyles.loading}>{collectionMessages.loading}</p>}>
        <CollectionLoader searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CollectionLoader({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const { slettet } = await searchParams;
  const userId = await currentUserId();
  if (userId === null) return <LoginRequired next="/oppskrifter" />;

  // Rett etter en sletting (Story 6.11): «Oppskriften … er slettet. Angre».
  const trashId =
    typeof slettet === "string" && /^\d{1,15}$/.test(slettet) ? Number(slettet) : null;
  const deleted = trashId === null ? null : getDeletedRecipe(userId, trashId);
  const banner =
    trashId !== null && deleted !== null && deleted.ok ? (
      <UndoDeleteBanner title={deleted.value.title} onUndo={restoreDeleted.bind(null, trashId)} />
    ) : null;

  const result = listCollection(userId);
  // Feil vises av error.tsx; en tom samling skal aldri skjule en databasefeil.
  if (!result.ok) throw new Error(`${collectionMessages.loadFailed} (${result.error.kind})`);

  if (result.value.length === 0) {
    return (
      <>
        {banner}
        <EmptyState
          title={collectionMessages.emptyTitle}
          description={collectionMessages.emptyDescription}
          action={{ href: "/ny", label: collectionMessages.emptyManualAction }}
          secondaryAction={{ href: "/importer", label: collectionMessages.emptyImportAction }}
        />
      </>
    );
  }

  return (
    <>
      {banner}
      <CollectionBrowser entries={result.value} />
    </>
  );
}
