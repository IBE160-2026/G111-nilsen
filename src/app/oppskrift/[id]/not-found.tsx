import type { Metadata } from "next";
import EmptyState from "@/components/EmptyState";
import { messageFor } from "@/lib/messages";
import styles from "../../list-page.module.css";

export const metadata: Metadata = { title: "Fant ikke oppskriften" };

/** Vises når `/oppskrift/[id]` kaller `notFound()` (ukjent eller ugyldig id). */
export default function RecipeNotFound() {
  const message = messageFor("not_found");
  return (
    <div className={styles.root}>
      <h1>Fant ikke oppskriften</h1>
      <EmptyState
        title={message.title}
        description={message.body}
        action={{ href: "/", label: "Gå til forsiden" }}
      />
    </div>
  );
}
