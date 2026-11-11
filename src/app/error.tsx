"use client";

import { useEffect } from "react";
import EmptyState from "@/components/EmptyState";
import { messageFor } from "@/lib/messages";
import styles from "./error.module.css";

/**
 * Norsk feilside for uventede feil (f.eks. når databasen ikke kan åpnes).
 * Viser reservemeldingen fra messages.ts, med «Prøv igjen» og vei tilbake til Importer.
 */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const message = messageFor(undefined);
  return (
    <div className={styles.root}>
      <h1>Noe gikk galt</h1>
      <EmptyState
        title={message.title}
        description={message.body}
        action={{ href: "/", label: "Gå til forsiden" }}
      />
      <div>
        <button type="button" className={styles.retry} onClick={() => retry()}>
          Prøv igjen
        </button>
      </div>
    </div>
  );
}
