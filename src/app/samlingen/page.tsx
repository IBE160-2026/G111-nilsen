import type { Metadata } from "next";
import EmptyState from "@/components/EmptyState";
import styles from "../list-page.module.css";

export const metadata: Metadata = { title: "Samlingen" };

export default function SamlingenPage() {
  return (
    <div className={styles.root}>
      <h1>Samlingen</h1>
      <EmptyState
        title="Du har ingen lagrede oppskrifter ennå."
        description="Oppskrifter du lagrer, havner her med den sist brukte øverst."
        action={{ href: "/", label: "Importer din første oppskrift" }}
      />
    </div>
  );
}
