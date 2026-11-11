import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import LoginRequired from "@/components/LoginRequired";
import TrashList from "@/components/TrashList";
import { trashMessages } from "@/lib/messages";
import { listDeletedRecipes } from "@/server/services/recipe-service";
import { currentUserId } from "@/server/session";
import styles from "../list-page.module.css";
import { deleteDeletedForGood, restoreDeleted } from "./actions";

export const metadata: Metadata = { title: trashMessages.heading };

/**
 * Nylig slettet, `/nylig-slettet` (Story 6.11). Overskriften står utenfor Suspense; listen leses
 * inne i grensen, etter `connection()`, som i Oppskrifter.
 */
export default function NyligSlettetPage() {
  return (
    <div className={styles.root}>
      <h1>{trashMessages.heading}</h1>
      <Suspense fallback={<p className={styles.loading}>{trashMessages.loading}</p>}>
        <TrashLoader />
      </Suspense>
    </div>
  );
}

async function TrashLoader() {
  await connection();
  const userId = await currentUserId();
  if (userId === null) return <LoginRequired next="/nylig-slettet" />;

  const result = listDeletedRecipes(userId);
  if (!result.ok) throw new Error(`${trashMessages.loadFailed} (${result.error.kind})`);

  const items = result.value.map((entry) => ({
    id: entry.id,
    title: entry.title,
    deletedLabel: trashMessages.deletedOn(
      new Date(entry.deletedAt).toLocaleDateString("nb-NO", {
        day: "numeric",
        month: "long",
        timeZone: "Europe/Oslo",
      }),
    ),
    expiresLabel: trashMessages.expiresIn(entry.daysLeft),
  }));

  return (
    <TrashList items={items} onRestore={restoreDeleted} onDeleteForGood={deleteDeletedForGood} />
  );
}
