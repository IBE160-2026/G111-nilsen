import type { Metadata } from "next";
import EmptyState from "@/components/EmptyState";
import styles from "../list-page.module.css";

export const metadata: Metadata = { title: "Mapper" };

export default function MapperPage() {
  return (
    <div className={styles.root}>
      <h1>Mapper</h1>
      <EmptyState
        title="Du har ingen mapper ennå."
        description="Legg oppskrifter i en mappe fra oppskriftssiden."
        action={{ href: "/samlingen", label: "Gå til samlingen" }}
      />
    </div>
  );
}
