"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ActionResult, ApplySuggestionActionResult } from "@/app/_shared/action-result";
import type { AppliedSuggestion, Suggestion, SuggestionSet } from "@/domain";
import type { SuggestionsActionResult } from "@/app/_shared/action-result";
import { messageFor, suggestionMessages } from "@/lib/messages";
import ErrorMessage from "./ErrorMessage";
import styles from "./SuggestionsSection.module.css";

type Status = "idle" | "pending" | "failed" | "done";

/** Antall plassholdere mens forslag hentes (det kommer 1–3). */
const PLACEHOLDER_COUNT = 3;

/** Reservemelding når et kall avvises (nettverk, kast). */
function fallbackText(): string {
  const message = messageFor(undefined);
  return `${message.title} ${message.body}`;
}

type Props = {
  onRequest: () => Promise<SuggestionsActionResult>;
  /** Forslagene som allerede er tatt i bruk, fra siden (Story 4.2). */
  applied: readonly AppliedSuggestion[];
  onApply: (suggestion: Suggestion) => Promise<ApplySuggestionActionResult>;
  onRemove: (id: number) => Promise<ActionResult>;
};

/**
 * Forslagsdelen på oppskriftssiden (FR-10, FR-11, FR-12, UX-DR7). «Få forslag» henter 1–3
 * forslag med begrunnelse; enkle forslag uten språkmodell merkes «Enkle forslag». «Ta i bruk» flytter et
 * forslag til «Dine valgte forslag» (lagres med oppskriften), «Hopp over» skjuler det (lagres
 * ikke), «Fjern» sletter et valgt forslag. Ingredienser og steg endres aldri. Delen eier listen
 * over valgte forslag (startverdi fra siden) og oppdaterer den fra svarene, så den ikke hopper
 * når sidene revalideres. Knapper som blir trykket beholder fokus mens kallet pågår
 * (aria-disabled); når de forsvinner, flyttes fokus til overskriften, og en statusmelding sier
 * hva som skjedde. Under henting vises plassholdere og «Lager forslag …», ved feil en melding.
 */
export default function SuggestionsSection({ onRequest, applied, onApply, onRemove }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<SuggestionSet | null>(null);
  const [chosen, setChosen] = useState<AppliedSuggestion[]>(() => [...applied]);
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(() => new Set());
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState<ReadonlySet<string>>(() => new Set());
  const headingId = useId();
  const chosenId = useId();
  const resultsId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const results = useRef<HTMLDivElement>(null);
  // Hindrer to kall ved dobbeltklikk, også før React har tegnet «pending».
  const requesting = useRef(false);
  const inFlight = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (status === "done") results.current?.focus();
  }, [status]);

  async function request() {
    if (requesting.current) return;
    requesting.current = true;
    setFeedback("");
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

  /** Kjører ett kall per nøkkel om gangen; knappene for nøkkelen er aria-disabled mens det pågår. */
  async function guarded(key: string, run: () => Promise<void>) {
    if (inFlight.current.has(key)) return;
    inFlight.current.add(key);
    setBusy(new Set(inFlight.current));
    try {
      await run();
    } catch {
      setFeedback(fallbackText());
    } finally {
      inFlight.current.delete(key);
      setBusy(new Set(inFlight.current));
    }
  }

  function apply(suggestion: Suggestion) {
    return guarded(`ny-${suggestion.text}`, async () => {
      const response = await onApply(suggestion);
      if (!response.ok) {
        setFeedback(response.message);
        return;
      }
      setChosen((current) =>
        current.some((item) => item.id === response.suggestion.id)
          ? current
          : [...current, response.suggestion],
      );
      setFeedback(suggestionMessages.appliedStatus);
      heading.current?.focus();
    });
  }

  function skip(suggestion: Suggestion) {
    setSkipped((current) => new Set(current).add(suggestion.text));
    setFeedback(suggestionMessages.skippedStatus);
    heading.current?.focus();
  }

  function remove(item: AppliedSuggestion) {
    return guarded(`valgt-${item.id}`, async () => {
      const response = await onRemove(item.id);
      if (!response.ok) {
        setFeedback(response.message);
        return;
      }
      setChosen((current) => current.filter((other) => other.id !== item.id));
      setFeedback(suggestionMessages.removedStatus);
      heading.current?.focus();
    });
  }

  const failure = messageFor("suggestion_failed");
  const pending = status === "pending";
  const chosenTexts = new Set(chosen.map((item) => item.text));
  // Et hentet forslag som allerede er valgt, eller som er hoppet over, vises ikke som nytt.
  const candidates = (result?.suggestions ?? []).filter(
    (suggestion) => !chosenTexts.has(suggestion.text) && !skipped.has(suggestion.text),
  );

  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <h2 id={headingId} ref={heading} tabIndex={-1} className={styles.heading}>
        {suggestionMessages.heading}
      </h2>

      {/* Statusfeltet står alltid i dokumentet, så skjermleseren leser opp teksten når den dukker opp. */}
      <p role="status" className={styles.status}>
        {pending ? suggestionMessages.pending : feedback}
      </p>

      {chosen.length > 0 ? (
        <div role="group" aria-labelledby={chosenId} className={styles.chosen}>
          <h3 id={chosenId} className={styles.subheading}>
            {suggestionMessages.chosenHeading}
          </h3>
          <ul className={styles.list} role="list">
            {chosen.map((item) => (
              <li key={item.id} className={styles.item}>
                <p className={styles.text}>{item.text}</p>
                <p className={styles.reason}>{item.reason}</p>
                <div className={styles.buttons}>
                  <span className={styles.badge}>{suggestionMessages.appliedBadge}</span>
                  <button
                    type="button"
                    className={styles.secondary}
                    aria-label={`${suggestionMessages.remove}: ${item.text}`}
                    aria-disabled={busy.has(`valgt-${item.id}`)}
                    onClick={() => void remove(item)}
                  >
                    {suggestionMessages.remove}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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
          <h3 id={resultsId} className={styles.subheading}>
            {suggestionMessages.resultsHeading}
          </h3>
          {result.isExample ? (
            <p className={styles.example}>
              <span className={styles.exampleLabel}>{suggestionMessages.exampleLabel}</span>{" "}
              {suggestionMessages.exampleNote}
            </p>
          ) : null}
          {candidates.length > 0 ? (
            <ul className={styles.list} role="list">
              {candidates.map((suggestion) => (
                <li key={suggestion.text} className={styles.item}>
                  <p className={styles.text}>{suggestion.text}</p>
                  <p className={styles.reason}>{suggestion.reason}</p>
                  <div className={styles.buttons}>
                    <button
                      type="button"
                      className={styles.primary}
                      aria-label={`${suggestionMessages.apply}: ${suggestion.text}`}
                      aria-disabled={busy.has(`ny-${suggestion.text}`)}
                      onClick={() => void apply(suggestion)}
                    >
                      {suggestionMessages.apply}
                    </button>
                    <button
                      type="button"
                      className={styles.secondary}
                      aria-label={`${suggestionMessages.skip}: ${suggestion.text}`}
                      onClick={() => skip(suggestion)}
                    >
                      {suggestionMessages.skip}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.lead}>{suggestionMessages.allHandled}</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
