import type { Metadata } from "next";
import EmptyState from "@/components/EmptyState";
import { folderMessages } from "@/lib/messages";
import styles from "../../list-page.module.css";

export const metadata: Metadata = { title: folderMessages.notFoundHeading };

/** Vises når `/mapper/[id]` kaller `notFound()` (ukjent eller ugyldig id). */
export default function FolderNotFound() {
  return (
    <div className={styles.root}>
      <h1>{folderMessages.notFoundHeading}</h1>
      <EmptyState
        title={folderMessages.notFoundTitle}
        description={folderMessages.notFoundBody}
        action={{ href: "/mapper", label: folderMessages.notFoundAction }}
      />
    </div>
  );
}
