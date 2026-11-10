import { formatMinutes } from "@/domain";
import { recipeTimeMessages as m } from "@/lib/messages";
import styles from "./RecipeTime.module.css";

/** Hvor lang tid oppskriften tar, med en klokke (Story 6.2). Vises ved favoritthjertet. */
export default function RecipeTime({ minutes }: { minutes: number }) {
  const time = formatMinutes(minutes);
  return (
    <p className={styles.time}>
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        width="20"
        height="20"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
        <path
          d="M12 7v5l3 2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="visually-hidden">{m.shown(time)}</span>
      <span aria-hidden="true">{time}</span>
    </p>
  );
}
