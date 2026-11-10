import type { Metadata } from "next";
import { Suspense } from "react";
import AccountForm from "@/components/AccountForm";
import { safeNextPath } from "@/lib/account-input";
import { accountMessages as m } from "@/lib/messages";
import { logInAccount } from "../account-actions";
import styles from "../ny/page.module.css";

export const metadata: Metadata = { title: m.loginHeading };

type SearchParams = Promise<{ neste?: string | string[] }>;

/** Innloggingssiden (Story 5.13). `?neste=/sti` sender brukeren dit etterpå. */
export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className={styles.root}>
      <header className={styles.intro}>
        <h1>{m.loginHeading}</h1>
        <p className={styles.lead}>{m.loginLead}</p>
      </header>
      <Suspense>
        <LoginForm searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function LoginForm({ searchParams }: { searchParams: SearchParams }) {
  const { neste } = await searchParams;
  return <AccountForm mode="login" action={logInAccount} next={safeNextPath(neste)} />;
}
