"use client";

import { useCallback, useLayoutEffect, useState } from "react";

/**
 * Avkryssede rader som ett `Set<number>` av id-er (AD-10). Tilstanden er bare React-tilstand:
 * den lagres aldri og påvirker ikke skalering.
 *
 * Med Cache Components skjuler Next.js en side med `<Activity>` i stedet for å avmontere den,
 * og da blir tilstanden stående. Opprydningen i `useLayoutEffect` kjører både når Activity
 * skjuler komponenten og når den avmonteres, og tømmer settet (se
 * `node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md`). Strict Mode kjører
 * effekten én ekstra gang ved første montering; da er settet allerede tomt og blir stående
 * uendret, så det gir ingen synlig forskjell.
 */
export function useCheckedSet(): {
  isChecked: (id: number) => boolean;
  toggle: (id: number) => void;
} {
  const [checked, setChecked] = useState<ReadonlySet<number>>(() => new Set());

  useLayoutEffect(() => {
    return () => {
      setChecked((previous) => (previous.size === 0 ? previous : new Set()));
    };
  }, []);

  const isChecked = useCallback((id: number) => checked.has(id), [checked]);

  const toggle = useCallback((id: number) => {
    setChecked((previous) => {
      const next = new Set(previous);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  return { isChecked, toggle };
}
