"use client";

import { useId } from "react";
import type { UnitSystem } from "@/domain";
import { unitMessages as m } from "@/lib/messages";
import styles from "./UnitChoice.module.css";

const OPTIONS: ReadonlyArray<{ value: UnitSystem; label: string }> = [
  { value: "original", label: m.original },
  { value: "dl", label: m.dl },
  { value: "gram", label: m.gram },
];

/** Valg av hvilke mål mengdene vises i (Story 5.9). Brukes på oppskriftssiden og i handlelisten. */
export default function UnitChoice({
  value,
  onChange,
}: {
  value: UnitSystem;
  onChange: (system: UnitSystem) => void;
}) {
  const name = useId();
  return (
    <fieldset className={styles.root}>
      <legend className={styles.legend}>{m.legend}</legend>
      <div className={styles.options}>
        {OPTIONS.map((option) => (
          <label key={option.value} className={styles.option}>
            <input
              type="radio"
              name={name}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      <p className={styles.hint}>{m.hint}</p>
    </fieldset>
  );
}
