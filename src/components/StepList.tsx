"use client";

import type { Step } from "@/domain";
import CheckRow from "./CheckRow";
import styles from "./StepList.module.css";
import { useCheckedSet } from "./use-checked-set";

/**
 * «Slik gjør du» (Story 1.6): nummererte steg, sortert på `position`, der hvert steg kan
 * krysses av. Avkrysningen er nøklet på steg-id i et eget sett, uavhengig av ingrediensene,
 * og lagres aldri. Nummeret er listemarkøren og blir stående når steget er avkrysset.
 */
export default function StepList({ steps }: { steps: readonly Step[] }) {
  const { isChecked, toggle } = useCheckedSet();
  if (steps.length === 0) return null;

  return (
    <section className={styles.card} aria-labelledby="fremgangsmate">
      <h2 id="fremgangsmate">Slik gjør du</h2>
      <ol className={styles.steps}>
        {[...steps]
          .sort((a, b) => a.position - b.position)
          .map((step) => (
            <CheckRow key={step.id} checked={isChecked(step.id)} onToggle={() => toggle(step.id)}>
              {step.text}
            </CheckRow>
          ))}
      </ol>
    </section>
  );
}
