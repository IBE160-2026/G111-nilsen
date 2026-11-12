"use client";

import type { Step } from "@/domain";
import { appliedSuggestionMessages } from "@/lib/messages";
import CheckRow from "./CheckRow";
import StepText from "./StepText";
import styles from "./StepList.module.css";
import { useCheckedSet } from "./use-checked-set";

type StepGroup = { section: string | null; steps: Step[] };

/**
 * Deler stegene i deler (Story 6.34b): etter hverandre følgende steg med samme del hører sammen,
 * og nummereringen starter på 1 i hver del. Uten deler er det én gruppe, som før.
 */
export function groupSteps(steps: readonly Step[]): StepGroup[] {
  const groups: StepGroup[] = [];
  for (const step of [...steps].sort((a, b) => a.position - b.position)) {
    const section = step.section?.trim() || null;
    const last = groups[groups.length - 1];
    if (last && last.section === section) last.steps.push(step);
    else groups.push({ section, steps: [step] });
  }
  return groups;
}

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
      {groupSteps(steps).map((group, groupIndex) => (
        <div key={`${groupIndex}-${group.section ?? ""}`} className={styles.group}>
          {group.section ? <h3 className={styles.sectionLabel}>{group.section}</h3> : null}
          {/* role="list": nettlesere kan ellers droppe listesemantikken når list-style er none. */}
          <ol className={styles.steps} role="list" aria-label={group.section ?? undefined}>
            {group.steps.map((step, index) => (
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
        </div>
      ))}
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
