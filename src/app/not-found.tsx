import type { Metadata } from "next";
import EmptyState from "@/components/EmptyState";
import styles from "./list-page.module.css";

export const metadata: Metadata = { title: "Fant ikke siden" };

export default function NotFound() {
  return (
    <div className={styles.root}>
      <h1>Fant ikke siden</h1>
      <EmptyState
        title="Siden finnes ikke."
        description="Lenken kan være feil, eller siden kan være flyttet. Gå til forsiden for å komme videre."
        action={{ href: "/", label: "Gå til forsiden" }}
      />
    </div>
  );
}
