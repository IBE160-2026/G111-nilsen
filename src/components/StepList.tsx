"use client";

import type { Step } from "@/domain";
import { appliedSuggestionMessages } from "@/lib/messages";
import CheckRow from "./CheckRow";
import StepText from "./StepText";
import styles from "./StepList.module.css";
import { useCheckedSet } from "./use-checked-set";

/**
 * «Slik gjør du» (Story 1.6): nummererte steg, sortert på `position`, der hvert steg kan
 * krysses av. Avkrysningen er nøklet på steg-id i et eget sett, uavhengig av ingrediensene,
 * og lagres aldri. Nummeret er et eget element foran boksen (ikke `::marker`) og blir stående når steget er avkrysset.
 */
export default function StepList({
  steps,
  tips = [],
}: {
  steps: readonly Step[];
  /** Forslag om hele retten som er tatt i bruk (Story 5.11), vist under stegene. */
  tips?: readonly string[];
}) {
  const { isChecked, toggle } = useCheckedSet();
  if (steps.length === 0 && tips.length === 0) return null;

  return (
    <section className={styles.card} aria-labelledby="fremgangsmate">
      <h2 id="fremgangsmate">Slik gjør du</h2>
      {/* role="list": nettlesere kan ellers droppe listesemantikken når list-style er none. */}
      <ol className={styles.steps} role="list">
        {[...steps]
          .sort((a, b) => a.position - b.position)
          .map((step, index) => (
            <CheckRow
              key={step.id}
              checked={isChecked(step.id)}
              onToggle={() => toggle(step.id)}
              marker={`${index + 1}.`}
            >
              <StepText step={step} />
            </CheckRow>
          ))}
      </ol>
      {tips.length > 0 ? (
        <div className={styles.tips}>
          <h3 className={styles.tipsHeading}>{appliedSuggestionMessages.tipsHeading}</h3>
          <ul role="list" className={styles.tipList}>
            {tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
