import Link from "next/link";
import styles from "./EmptyState.module.css";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: { href: string; label: string };
};

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section className={styles.root}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{description}</p>
      {action ? (
        <Link href={action.href} className={styles.action}>
          {action.label}
        </Link>
      ) : null}
    </section>
  );
}
