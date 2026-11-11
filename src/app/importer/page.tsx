import type { Metadata } from "next";
import Link from "next/link";
import ImportForm from "@/components/ImportForm";
import { importMessages, pasteMessages } from "@/lib/messages";
import { submitImport } from "../actions";
import styles from "./page.module.css";

export const metadata: Metadata = { title: importMessages.tabTitle };

export default function ImporterPage() {
  return (
    <section className={styles.intro}>
      <h1>{importMessages.heading}</h1>
      <p className={styles.lead}>{importMessages.lead}</p>
      <ImportForm action={submitImport} />
      <p className={styles.manual}>
        {importMessages.manualPrompt}{" "}
        <Link href="/ny" className={styles.manualLink}>
          {importMessages.enterManually}
        </Link>
      </p>
      <p className={styles.manual}>
        {pasteMessages.linkPrompt}{" "}
        <Link href="/lim-inn" className={styles.manualLink}>
          {pasteMessages.link}
        </Link>
      </p>
    </section>
  );
}
