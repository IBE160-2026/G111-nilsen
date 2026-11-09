import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import FolderManager from "@/components/FolderManager";
import { folderMessages } from "@/lib/messages";
import { listFolders } from "@/server/services/folder-service";
import styles from "../list-page.module.css";
import { createFolder, deleteFolder, renameFolder } from "./actions";

export const metadata: Metadata = { title: folderMessages.heading };

/**
 * Mapper (Story 3.3). Overskriften står utenfor Suspense; mappene leses inne i grensen, etter
 * `connection()`, slik at databasen bare leses ved en faktisk forespørsel.
 */
export default function MapperPage() {
  return (
    <div className={styles.root}>
      <h1>{folderMessages.heading}</h1>
      <Suspense fallback={<p className={styles.loading}>{folderMessages.loading}</p>}>
        <FolderLoader />
      </Suspense>
    </div>
  );
}

async function FolderLoader() {
  await connection();

  const result = listFolders();
  // Feil vises av error.tsx; en tom liste skal aldri skjule en databasefeil.
  if (!result.ok) throw new Error(`${folderMessages.loadFailed} (${result.error.kind})`);

  return (
    <FolderManager
      folders={result.value}
      onCreate={createFolder}
      onRename={renameFolder}
      onDelete={deleteFolder}
    />
  );
}
