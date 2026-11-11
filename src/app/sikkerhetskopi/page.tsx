import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import ImportBackupForm from "@/components/ImportBackupForm";
import LoginRequired from "@/components/LoginRequired";
import { backupMessages as m } from "@/lib/messages";
import { listCollection } from "@/server/services/recipe-service";
import { currentUserId } from "@/server/session";
import { importBackupFile } from "./actions";
import styles from "./page.module.css";

export const metadata: Metadata = { title: m.tabTitle };

/**
 * Eksport og import, `/sikkerhetskopi` (Story 6.15). Overskriften står utenfor Suspense; data
 * leses inne i grensen, etter `connection()`.
 */
export default function BackupPage() {
  return (
    <div className={styles.root}>
      <h1>{m.heading}</h1>
      <p className={styles.lead}>{m.lead}</p>
      <Suspense fallback={<p>{m.loading}</p>}>
        <BackupLoader />
      </Suspense>
    </div>
  );
}

async function BackupLoader() {
  await connection();
  const userId = await currentUserId();
  if (userId === null) return <LoginRequired next="/sikkerhetskopi" />;
  const recipes = listCollection(userId);
  if (!recipes.ok) throw new Error(recipes.error.kind);
  const count = recipes.value.length;

  return (
    <>
      <section aria-labelledby="eksport" className={styles.card}>
        <h2 id="eksport">{m.exportHeading}</h2>
        <p>{m.exportText(count)}</p>
        {count > 0 ? (
          // Vanlig lenke: filen lastes ned, ikke en sidenavigasjon.
          <a href="/sikkerhetskopi/eksport" download className={styles.download}>
            {m.exportButton}
          </a>
        ) : null}
      </section>
      <section aria-labelledby="import" className={styles.card}>
        <h2 id="import">{m.importHeading}</h2>
        <p>{m.importText}</p>
        <ImportBackupForm action={importBackupFile} />
      </section>
    </>
  );
}
