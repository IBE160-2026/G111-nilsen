"use client";

import { useState } from "react";
import { formatQuantity, scaleLine, type RecipeLine, type ScaledLine } from "@/domain";
import { LIMITS } from "@/lib/recipe-input";
import ServingStepper from "./ServingStepper";
import styles from "./IngredientList.module.css";

type Group = { section: string | null; lines: RecipeLine[] };

/**
 * Grupperer linjene per seksjon: linjer uten seksjon først, deretter seksjonene i
 * rekkefølgen de først dukker opp. Innenfor hver gruppe beholdes lagret rekkefølge.
 */
export function groupBySection(lines: readonly RecipeLine[]): Group[] {
  const sorted = [...lines].sort((a, b) => a.position - b.position);
  const unsectioned: Group = { section: null, lines: [] };
  const sections = new Map<string, Group>();
  for (const line of sorted) {
    const name = line.section?.trim() || null;
    if (name === null) {
      unsectioned.lines.push(line);
      continue;
    }
    let group = sections.get(name);
    if (!group) {
      group = { section: name, lines: [] };
      sections.set(name, group);
    }
    group.lines.push(line);
  }
  return [unsectioned, ...sections.values()].filter((group) => group.lines.length > 0);
}

function Line({ line }: { line: ScaledLine }) {
  if (!line.parseable || line.quantity === null) {
    return <li className={`${styles.line} ${styles.unparsed}`}>{line.original}</li>;
  }
  const amount = [formatQuantity(line.quantity), line.unit ?? ""].filter(Boolean).join(" ");
  return (
    <li className={styles.line}>
      {/* Mellomrommene gir lesbar tekst for skjermlesere og kopiering; grid og flex ignorerer dem. */}
      <span className={styles.amount}>{amount}</span>
      {line.name || line.approximate ? (
        <>
          {" "}
          <span className={styles.name}>
            {line.name ? <span>{line.name}</span> : null}
            {line.name && line.approximate ? " " : null}
            {line.approximate ? <span className={styles.approximate}>ca.</span> : null}
          </span>
        </>
      ) : null}
    </li>
  );
}

type Props = {
  ingredients: readonly RecipeLine[];
  /** Antallet oppskriften er skrevet for; `null` gir uskalerte linjer og ingen porsjonsvelger. */
  originalServings: number | null;
};

/**
 * Porsjonsvelger og ingredienser (Story 1.5). Valgt antall er bare React-tilstand.
 * Hver visning skalerer fra originalmengdene i `RecipeLine`, aldri fra forrige
 * skalerte verdi, og ingenting sendes til serveren.
 */
/** Opprinnelig antall som kan skaleres fra: heltall innenfor 1–50, ellers `null`. */
function validServings(value: number | null): number | null {
  return value !== null &&
    Number.isInteger(value) &&
    value >= LIMITS.servingsMin &&
    value <= LIMITS.servingsMax
    ? value
    : null;
}

export default function IngredientList({ ingredients, originalServings: rawOriginal }: Props) {
  // Ugyldig opprinnelig antall (0, negativt, desimal, over 50) behandles som manglende.
  const originalServings = validServings(rawOriginal);
  const [selected, setSelected] = useState(originalServings);
  const factor = originalServings !== null && selected !== null ? selected / originalServings : 1;
  const groups = groupBySection(ingredients);

  return (
    <div className={styles.root}>
      {originalServings !== null && selected !== null ? (
        <ServingStepper value={selected} onChange={setSelected} original={originalServings} />
      ) : null}

      <section className={styles.card} aria-labelledby="ingredienser">
        <h2 id="ingredienser">Ingredienser</h2>
        {groups.map((group, index) => {
          const labelId = group.section ? `ingrediensseksjon-${index}` : undefined;
          return (
            <div key={group.section ?? ""} className={styles.group}>
              {group.section ? (
                <h3 id={labelId} className={styles.sectionLabel}>
                  {group.section}
                </h3>
              ) : null}
              <ul className={styles.lines} aria-labelledby={labelId}>
                {group.lines.map((line) => (
                  <Line key={line.id} line={scaleLine(line, factor)} />
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
