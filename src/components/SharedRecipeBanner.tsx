"use client";

import Link from "next/link";
import { useState } from "react";
import { shareMessages as m } from "@/lib/messages";
import styles from "./SharedRecipeBanner.module.css";

type CopyResult = { ok: true; id: number } | { ok: false; message: string };

/**
 * Vises over en oppskrift som kommer fra en delt samling (Story 6.19): hvem den er delt av, og
 * «Kopier til min samling». Kopien er din egen og kan endres fritt.
 */
export default function SharedRecipeBanner({
  email,
  onCopy,
}: {
  email: string;
  onCopy: () => Promise<CopyResult>;
}) {
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className={styles.root} data-print="hide">
      <p className={styles.text}>{m.sharedBy(email)}</p>
      {copied === null ? (
        <button
          type="button"
          className={styles.button}
          aria-disabled={pending || undefined}
          onClick={() => {
            if (pending) return;
            setPending(true);
            onCopy()
              .then((result) => {
                if (result.ok) {
                  setCopied(result.id);
                  setStatus(m.copied);
                } else {
                  setStatus(result.message);
                }
              })
              .catch((error: unknown) => {
                console.error("Kunne ikke kopiere oppskriften", error);
                setStatus(m.copyFailed);
              })
              .finally(() => setPending(false));
          }}
        >
          {m.copyToMine}
        </button>
      ) : (
        <Link href={`/oppskrift/${copied}`} className={styles.button}>
          {m.openCollection}
        </Link>
      )}
      <p role="status" aria-live="polite" className={styles.status}>
        {status}
      </p>
    </div>
  );
}
