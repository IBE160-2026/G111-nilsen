"use client";

import { createContext, useContext, useRef, type MutableRefObject, type ReactNode } from "react";
import type { UnitSystem } from "@/domain";

/**
 * Siste valg brukeren har gjort på oppskriftssiden, delt mellom komponentene som ikke har noe
 * annet til felles. To refs, ingen gjengivelse, ingen lagring:
 * - antall porsjoner (issue 009): porsjonsvelgeren (`IngredientList`) melder fra, «Lagre»
 *   (`RecipeActions`) sender det med, og kokemodus (Story 5.4) leser det, så et antall valgt
 *   *før* lagring huskes og vises riktig.
 * - målsystem (Story 5.5): «Metriske mål» i `IngredientList`, lest av kokemodus.
 * Uten leverandør (for eksempel i enkeltkomponent-tester) gjør meldingene ingenting.
 */
const ServingsContext = createContext<MutableRefObject<number | null> | null>(null);
const UnitsContext = createContext<MutableRefObject<UnitSystem> | null>(null);

export function SelectedServingsProvider({ children }: { children: ReactNode }) {
  const servings = useRef<number | null>(null);
  const units = useRef<UnitSystem>("original");
  return (
    <ServingsContext.Provider value={servings}>
      <UnitsContext.Provider value={units}>{children}</UnitsContext.Provider>
    </ServingsContext.Provider>
  );
}

/** Funksjonen porsjonsvelgeren kaller når antallet endres. */
export function useReportSelectedServings(): (servings: number) => void {
  const ref = useContext(ServingsContext);
  return (servings) => {
    if (ref) ref.current = servings;
  };
}

/** Funksjonen «Lagre» kaller for å hente antallet brukeren har valgt (`undefined` hvis ingen). */
export function useGetSelectedServings(): () => number | undefined {
  const ref = useContext(ServingsContext);
  return () => ref?.current ?? undefined;
}

/** Funksjonen ingredienslisten kaller når målsystemet byttes. */
export function useReportUnitSystem(): (system: UnitSystem) => void {
  const ref = useContext(UnitsContext);
  return (system) => {
    if (ref) ref.current = system;
  };
}

/** Målsystemet brukeren har valgt på siden (`original` hvis ingenting er valgt). */
export function useGetUnitSystem(): () => UnitSystem {
  const ref = useContext(UnitsContext);
  return () => ref?.current ?? "original";
}
