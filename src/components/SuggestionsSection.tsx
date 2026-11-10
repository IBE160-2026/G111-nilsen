"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { SuggestionSet } from "@/domain";
import { messageFor, suggestionMessages } from "@/lib/messages";
import type { SuggestionsActionResult } from "@/app/_shared/action-result";
import ErrorMessage from "./ErrorMessage";
import styles from "./SuggestionsSection.module.css";

type Status = "idle" | "pending" | "failed" | "done";

/** Antall plassholdere mens forslag hentes (det kommer 1–3). */
const PLACEHOLDER_COUNT = 3;

/**
 * Forslagsdelen på oppskriftssiden (Story 4.1, FR-10, FR-12, UX-DR7). «Få forslag» henter 1–3
 * forslag med begrunnelse; eksempelforslag merkes «Eksempelforslag». Under henting vises
 * plassholdere og «Lager forslag …», ved feil en melding og «Prøv igjen», og resten av siden
 * virker. Knappen blir stående mens det hentes (aria-disabled), så fokus ikke mistes, og
 * fokus flyttes til forslagene når de kommer. Forslag lagres ikke (Story 4.2).
 */
export default function SuggestionsSection({
  onRequest,
}: {
  onRequest: () => Promise<SuggestionsActionResult>;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<SuggestionSet | null>(null);
  const headingId = useId();
  const resultsId = useId();
  const results = useRef<HTMLDivElement>(null);
  // Hindrer to kall ved dobbeltklikk, også før React har tegnet «pending».
  const requesting = useRef(false);

  useEffect(() => {
    if (status === "done") results.current?.focus();
  }, [status]);

  async function request() {
    if (requesting.current) return;
    requesting.current = true;
    setStatus("pending");
    try {
      const response = await onRequest();
      if (response.ok) {
        setResult({ suggestions: response.suggestions, isExample: response.isExample });
        setStatus("done");
      } else {
        setStatus("failed");
      }
    } catch {
      setStatus("failed");
    } finally {
      requesting.current = false;
    }
  }

  const failure = messageFor("suggestion_failed");
  const pending = status === "pending";

  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <h2 id={headingId}>{suggestionMessages.heading}</h2>

      {status !== "done" ? (
        <>
          {status === "idle" || pending ? (
            <p className={styles.lead}>{suggestionMessages.lead}</p>
          ) : null}
          {status === "failed" ? <ErrorMessage title={failure.title} body={failure.body} /> : null}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              // aria-disabled (ikke disabled): knappen beholder fokus mens det hentes.
              aria-disabled={pending}
              onClick={() => void request()}
            >
              {status === "failed" ? suggestionMessages.retry : suggestionMessages.request}
            </button>
          </div>
          {/* Statusfeltet står alltid i dokumentet, så skjermleseren leser opp teksten når den dukker opp. */}
          <p role="status" className={styles.pending}>
            {pending ? suggestionMessages.pending : ""}
          </p>
          {pending ? (
            <ul className={styles.list} aria-hidden="true">
              {Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => (
                <li key={index} className={`${styles.item} ${styles.placeholder}`}>
                  <span className={styles.bar} />
                  <span className={styles.barShort} />
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}

      {status === "done" && result ? (
        <div
          ref={results}
          role="group"
          tabIndex={-1}
          className={styles.results}
          aria-labelledby={resultsId}
        >
          <h3 id={resultsId} className={styles.resultsHeading}>
            {suggestionMessages.resultsHeading}
          </h3>
          {result.isExample ? (
            <p className={styles.example}>
              <span className={styles.exampleLabel}>{suggestionMessages.exampleLabel}</span>{" "}
              {suggestionMessages.exampleNote}
            </p>
          ) : null}
          <ul className={styles.list} role="list">
            {result.suggestions.map((suggestion, index) => (
              <li key={index} className={styles.item}>
                <p className={styles.text}>{suggestion.text}</p>
                <p className={styles.reason}>{suggestion.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
