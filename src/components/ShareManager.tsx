"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { ActionResult } from "@/app/_shared/action-result";
import type { InviteResult } from "@/app/delt/actions";
import { fallbackMessage, shareMessages as m } from "@/lib/messages";
import type { Share } from "@/server/services/share-service";
import styles from "./ShareManager.module.css";

type Props = {
  /** Delingene brukeren selv har invitert til. */
  mine: readonly Share[];
  /** Delingene andre har invitert brukeren til. */
  theirs: readonly Share[];
  onInvite: (email: string) => Promise<InviteResult>;
  onAccept: (id: number) => Promise<ActionResult>;
  onStop: (id: number) => Promise<ActionResult>;
};

/**
 * Deling av samlingen (Story 6.19): invitere noen, se hvem man deler med, og svare på
 * invitasjoner. Listene kommer fra serveren og oppdateres ved revalidering; meldinger vises her.
 */
export default function ShareManager({ mine, theirs, onInvite, onAccept, onStop }: Props) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);

  async function run(work: () => Promise<void>) {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await work();
    } catch (caught) {
      console.error("Delingen kunne ikke endres", caught);
      setError(`${fallbackMessage.title} ${fallbackMessage.body}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.root}>
      <section aria-labelledby={`${id}-inviter`} className={styles.card}>
        <h2 id={`${id}-inviter`}>{m.inviteHeading}</h2>
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              const result = await onInvite(email);
              if (!result.ok) {
                setError(result.message);
                return;
              }
              setStatus(m.invited(result.email));
              setEmail("");
            });
          }}
        >
          <div className={styles.field}>
            <label htmlFor={`${id}-epost`} className={styles.label}>
              {m.inviteLabel}
            </label>
            <input
              id={`${id}-epost`}
              type="email"
              autoComplete="off"
              className={styles.input}
              value={email}
              aria-invalid={error !== "" ? true : undefined}
              aria-describedby={error !== "" ? `${id}-feil` : undefined}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <button type="submit" className={styles.button} aria-disabled={pending || undefined}>
            {m.inviteButton}
          </button>
        </form>
        {error !== "" ? (
          <p id={`${id}-feil`} role="alert" className={styles.error}>
            {error}
          </p>
        ) : null}
        <p role="status" aria-live="polite" className={styles.state}>
          {status}
        </p>
      </section>

      <section aria-labelledby={`${id}-mine`} className={styles.card}>
        <h2 id={`${id}-mine`}>{m.mineHeading}</h2>
        {mine.length === 0 ? (
          <p className={styles.hint}>{m.mineEmpty}</p>
        ) : (
          <ul className={styles.list}>
            {mine.map((share) => (
              <li key={share.id} className={styles.item}>
                <span className={styles.email}>{share.email}</span>
                <span className={styles.state}>
                  {share.status === "accepted" ? m.accepted : m.waiting}
                </span>
                <button
                  type="button"
                  className={`${styles.button} ${styles.quiet}`}
                  aria-label={m.stopFor(share.email)}
                  aria-disabled={pending || undefined}
                  onClick={() =>
                    void run(async () => {
                      const result = await onStop(share.id);
                      if (!result.ok) setError(result.message);
                      else setStatus(m.stopped(share.email));
                    })
                  }
                >
                  {m.stop}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby={`${id}-deres`} className={styles.card}>
        <h2 id={`${id}-deres`}>{m.theirsHeading}</h2>
        {theirs.length === 0 ? (
          <p className={styles.hint}>{m.theirsEmpty}</p>
        ) : (
          <ul className={styles.list}>
            {theirs.map((share) => (
              <li key={share.id} className={styles.item}>
                <span className={styles.email}>{share.email}</span>
                {share.status === "accepted" ? (
                  <Link
                    href={`/delt/${share.ownerId}`}
                    className={styles.button}
                    aria-label={m.openFor(share.email)}
                  >
                    {m.openCollection}
                  </Link>
                ) : (
                  <>
                    <span className={styles.state}>{m.invitationFrom(share.email)}</span>
                    <button
                      type="button"
                      className={styles.button}
                      aria-label={m.acceptFor(share.email)}
                      aria-disabled={pending || undefined}
                      onClick={() =>
                        void run(async () => {
                          const result = await onAccept(share.id);
                          if (!result.ok) setError(result.message);
                          else setStatus(m.acceptedInvite(share.email));
                        })
                      }
                    >
                      {m.accept}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className={`${styles.button} ${styles.quiet}`}
                  aria-label={
                    share.status === "accepted" ? m.stopFor(share.email) : m.declineFor(share.email)
                  }
                  aria-disabled={pending || undefined}
                  onClick={() =>
                    void run(async () => {
                      const result = await onStop(share.id);
                      if (!result.ok) setError(result.message);
                      else
                        setStatus(
                          share.status === "accepted" ? m.stopped(share.email) : m.declined,
                        );
                    })
                  }
                >
                  {share.status === "accepted" ? m.stop : m.decline}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
