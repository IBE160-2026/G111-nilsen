import { appliedSuggestionMessages as m } from "@/lib/messages";
import styles from "./SuggestedBadge.module.css";

/** Merke på en ingredienslinje eller et steg som kommer fra et forslag (Story 5.11). */
export default function SuggestedBadge() {
  return (
    <span className={styles.badge} data-suggested="">
      {m.badge}
    </span>
  );
}
