import type { ReactNode } from "react";
import styles from "./CheckRow.module.css";

type Props = {
  checked: boolean;
  onToggle: () => void;
  /** Radens innhold. Teksten blir avkrysningsboksens tilgjengelige navn. */
  children: ReactNode;
  /** Ekstra klasse på `<li>`, for eksempel skillelinje mellom rader. */
  className?: string;
};

/**
 * En avkrysningsrad (FR-17, UX-DR6, UX-DR16): `<li>` med en `<label>` som omslutter en ekte
 * `<input type="checkbox">` og innholdet, så hele raden er trykkflate og mellomrom veksler når
 * boksen har fokus. Avkrysset vises med fylt boks, hake og gjennomstreking, ikke med farge alene.
 * Komponenten har ingen egen tilstand; forelderen eier avkrysningen.
 */
export default function CheckRow({ checked, onToggle, children, className }: Props) {
  return (
    <li className={className ? `${styles.row} ${className}` : styles.row}>
      <label className={styles.label}>
        <input type="checkbox" className={styles.input} checked={checked} onChange={onToggle} />
        <span className={styles.content}>{children}</span>
      </label>
    </li>
  );
}
