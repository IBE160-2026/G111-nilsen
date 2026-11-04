import type { Metadata } from "next";
import EmptyState from "@/components/EmptyState";
import styles from "../list-page.module.css";

export const metadata: Metadata = { title: "Favoritter" };

export default function FavoritterPage() {
  return (
    <div className={styles.root}>
      <h1>Favoritter</h1>
      <EmptyState
        title="Du har ingen favoritter ennå."
        description="Trykk på hjertet på en oppskrift for å gjøre den til favoritt."
        action={{ href: "/samlingen", label: "Gå til samlingen" }}
      />
    </div>
  );
}
