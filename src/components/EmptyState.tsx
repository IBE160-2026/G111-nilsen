import Link from "next/link";
import styles from "./EmptyState.module.css";

type EmptyStateAction = { href: string; label: string };

type EmptyStateProps = {
  title: string;
  description: string;
  action?: EmptyStateAction;
  /** Sekundærknapp (kantlinje, ikke fylt) etter hovedhandlingen. */
  secondaryAction?: EmptyStateAction;
};

export default function EmptyState({
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <section className={styles.root}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{description}</p>
      {action || secondaryAction ? (
        <div className={styles.actions}>
          {action ? (
            <Link href={action.href} className={styles.action}>
              {action.label}
            </Link>
          ) : null}
          {secondaryAction ? (
            <Link href={secondaryAction.href} className={styles.secondaryAction}>
              {secondaryAction.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
