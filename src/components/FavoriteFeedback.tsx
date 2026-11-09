"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { STATUS_MESSAGE_MS } from "@/lib/timing";

/** Hvor lenge en melding står i statusområdet, i millisekunder (som «Lagret.»). */
export const FAVORITE_MESSAGE_MS = STATUS_MESSAGE_MS;

type FavoriteFeedbackValue = {
  /** Sier fra i statusområdet (`role="status"`) i 3 sekunder. */
  announce: (text: string) => void;
  /** Flytter fokus til overskriften, når hjertet som hadde fokus fjernes sammen med kortet. */
  focusHeading: () => void;
};

const FavoriteFeedbackContext = createContext<FavoriteFeedbackValue | null>(null);

/** Gir hjerteknappene tilgang til statusområdet og fokusflyttingen i `FavoriteFeedback`, ellers `null`. */
export function useFavoriteFeedback(): FavoriteFeedbackValue | null {
  return useContext(FavoriteFeedbackContext);
}

/**
 * Rammen rundt listen på Favoritter (Story 3.4). Når en favoritt avmarkeres, forsvinner kortet
 * etter revalidering, og dermed knappen som hadde fokus. Her står derfor statusområdet som
 * overlever at kortet fjernes («Fjernet fra favoritter.»), og fokus kan flyttes til
 * overskriften (`headingId`, med `tabIndex={-1}`) i stedet for å gå tapt.
 */
export default function FavoriteFeedback({
  headingId,
  children,
}: {
  headingId: string;
  children: React.ReactNode;
}) {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  const announce = useCallback((text: string) => {
    if (timer.current !== null) clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => {
      timer.current = null;
      setMessage("");
    }, FAVORITE_MESSAGE_MS);
  }, []);

  const focusHeading = useCallback(() => {
    document.getElementById(headingId)?.focus();
  }, [headingId]);

  const value = useMemo(() => ({ announce, focusHeading }), [announce, focusHeading]);

  return (
    <FavoriteFeedbackContext.Provider value={value}>
      {children}
      <p role="status" className="visually-hidden">
        {message}
      </p>
    </FavoriteFeedbackContext.Provider>
  );
}
