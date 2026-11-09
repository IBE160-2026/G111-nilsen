"use client";

import { useEffect, useLayoutEffect, useOptimistic, useRef, useState, useTransition } from "react";
import type { ActionResult } from "@/app/_shared/action-result";
import { fallbackMessage, favoriteMessages } from "@/lib/messages";
import { useFavoriteFeedback } from "./FavoriteFeedback";
import styles from "./FavoriteButton.module.css";

/** Utfallet av ett trykk: ny verdi lagret, eller en norsk melding og hjertet rullet tilbake. */
export type FavoriteResult = { ok: true; isFavorite: boolean } | { ok: false; message: string };

type Props = {
  /** Oppskriftens tittel; står i den tilgjengelige etiketten «Favoritt: <tittel>». */
  title: string;
  /** Tilstanden fra serveren. Endres den (revalidering, Activity), følger knappen med. */
  isFavorite: boolean;
  /** Server Action bundet til oppskriften: setter favoritt til eksplisitt verdi. */
  onSetFavorite: (isFavorite: boolean) => Promise<ActionResult>;
  /**
   * Når satt, melder knappen utfallet hit (for eksempel lagre-linjen) og viser ikke selv
   * feilmeldingen. Uten den vises feilen under hjertet, og et eventuelt statusområde rundt
   * (`FavoriteFeedback`) får beskjed om vellykkede endringer.
   */
  onResult?: (result: FavoriteResult) => void;
  className?: string;
};

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      aria-hidden="true"
      focusable="false"
    >
      {/* Fylt = favoritt, omriss = ikke favoritt: formen bærer tilstanden, ikke bare fargen. */}
      <path
        d="M12 20.5l-1.4-1.3C5.4 14.4 2 11.3 2 7.5 2 4.4 4.4 2 7.5 2c1.7 0 3.4.8 4.5 2.1C13.1 2.8 14.8 2 16.5 2 19.6 2 22 4.4 22 7.5c0 3.8-3.4 6.9-8.6 11.7L12 20.5z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Hjerteknappen (Story 3.4, UX-DR11): en av/på-knapp med `aria-pressed` og en stabil etikett
 * som nevner oppskriften («Favoritt: Pannekaker»). Hjertet skifter umiddelbart (optimistisk) og
 * rulles tilbake med en melding hvis handlingen feiler. Trykk mens et kall pågår legger den
 * siste ønskede verdien i kø: kallene sendes ett om gangen i rekkefølge, så de aldri kappløper,
 * og sluttilstanden er det siste trykket. Knappen sender alltid en eksplisitt verdi.
 */
export default function FavoriteButton({
  title,
  isFavorite,
  onSetFavorite,
  onResult,
  className,
}: Props) {
  const feedback = useFavoriteFeedback();
  const button = useRef<HTMLButtonElement>(null);
  // Siste verdi serveren har bekreftet. Følger `isFavorite` når den endres utenfra.
  const [confirmed, setConfirmed] = useState(isFavorite);
  const confirmedRef = useRef(isFavorite);
  useEffect(() => {
    confirmedRef.current = isFavorite;
  }, [isFavorite]);
  const [seenProp, setSeenProp] = useState(isFavorite);
  if (seenProp !== isFavorite) {
    setSeenProp(isFavorite);
    setConfirmed(isFavorite);
  }
  const [shown, setShown] = useOptimistic(confirmed, (_current, next: boolean) => next);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  // Kallene går i kø slik at to trykk aldri er på vei til serveren samtidig.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  // Nummer på siste trykk og siste verdi serveren har bekreftet. Et trykk som er overstyrt av et
  // nyere melder ikke selv (ingen «Fjernet» for noe som aldri ble lagt til, ingen gammel feil).
  const latestPress = useRef(0);

  // Hjertet som har fokus fjernes sammen med kortet (avmarkert på Favoritter): flytt fokus til
  // en stabil plass i stedet for å la det gå tapt.
  useLayoutEffect(() => {
    const element = button.current;
    return () => {
      if (element && document.activeElement === element) feedback?.focusHeading();
    };
  }, [feedback]);

  async function send(next: boolean): Promise<ActionResult> {
    try {
      return await onSetFavorite(next);
    } catch (caught) {
      console.error("Kunne ikke endre favorittmarkeringen", caught);
      return { ok: false, message: `${fallbackMessage.title} ${fallbackMessage.body}` };
    }
  }

  function press() {
    const next = !shown;
    const pressNo = ++latestPress.current;
    setError(null);
    startTransition(async () => {
      setShown(next);
      const job = queue.current.then(() => send(next));
      queue.current = job;
      const result = await job;
      const superseded = pressNo !== latestPress.current;
      if (result.ok) {
        const changed = confirmedRef.current !== next;
        confirmedRef.current = next;
        setConfirmed(next);
        if (changed && !superseded) {
          feedback?.announce(next ? favoriteMessages.added : favoriteMessages.removed);
          onResult?.({ ok: true, isFavorite: next });
        }
      } else if (!superseded) {
        if (!onResult) setError(result.message);
        onResult?.({ ok: false, message: result.message });
      }
    });
  }

  return (
    <>
      <button
        ref={button}
        type="button"
        className={`${styles.button} ${className ?? ""}`.trim()}
        aria-pressed={shown}
        aria-label={`${favoriteMessages.labelPrefix}${title}`}
        onClick={(event) => {
          // Safari fokuserer ikke knapper ved klikk; fokus skal kunne flyttes når kortet forsvinner.
          event.currentTarget.focus();
          press();
        }}
      >
        <HeartIcon filled={shown} />
      </button>
      {error !== null ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
    </>
  );
}
