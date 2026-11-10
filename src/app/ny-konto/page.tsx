import type { Metadata } from "next";
import { Suspense } from "react";
import AccountForm from "@/components/AccountForm";
import { safeNextPath } from "@/lib/account-input";
import { accountMessages as m } from "@/lib/messages";
import { registerAccount } from "../account-actions";
import styles from "../ny/page.module.css";

export const metadata: Metadata = { title: m.registerHeading };

type SearchParams = Promise<{ neste?: string | string[] }>;

/** Siden «Lag en konto» (Story 5.13). `?neste=/sti` sender brukeren dit etterpå. */
export default function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className={styles.root}>
      <header className={styles.intro}>
        <h1>{m.registerHeading}</h1>
        <p className={styles.lead}>{m.registerLead}</p>
      </header>
      <Suspense>
        <RegisterForm searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function RegisterForm({ searchParams }: { searchParams: SearchParams }) {
  const { neste } = await searchParams;
  return <AccountForm mode="register" action={registerAccount} next={safeNextPath(neste)} />;
}
