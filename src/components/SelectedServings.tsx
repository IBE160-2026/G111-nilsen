"use client";

import { createContext, useContext, useRef, type MutableRefObject, type ReactNode } from "react";

/**
 * Siste antall personer brukeren har valgt på oppskriftssiden (issue 009). Porsjonsvelgeren
 * (`IngredientList`) melder fra, og «Lagre» (`RecipeActions`) leser det og sender det med, så
 * et antall som er valgt *før* lagring huskes. Bare en ref: ingen gjengivelse, ingen lagring.
 * Uten leverandør (for eksempel i enkeltkomponent-tester) gjør meldingene ingenting.
 */
const SelectedServingsContext = createContext<MutableRefObject<number | null> | null>(null);

export function SelectedServingsProvider({ children }: { children: ReactNode }) {
  const selected = useRef<number | null>(null);
  return (
    <SelectedServingsContext.Provider value={selected}>{children}</SelectedServingsContext.Provider>
  );
}

/** Funksjonen porsjonsvelgeren kaller når antallet endres. */
export function useReportSelectedServings(): (servings: number) => void {
  const ref = useContext(SelectedServingsContext);
  return (servings) => {
    if (ref) ref.current = servings;
  };
}

/** Funksjonen «Lagre» kaller for å hente antallet brukeren har valgt (`undefined` hvis ingen). */
export function useGetSelectedServings(): () => number | undefined {
  const ref = useContext(SelectedServingsContext);
  return () => ref?.current ?? undefined;
}
