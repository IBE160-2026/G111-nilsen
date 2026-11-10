"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import styles from "./TopNav.module.css";

export const NAV_ITEMS = [
  { href: "/", label: "Importer" },
  { href: "/oppskrifter", label: "Oppskrifter" },
  { href: "/mapper", label: "Mapper" },
  { href: "/favoritter", label: "Favoritter" },
  { href: "/handleliste", label: "Handleliste" },
] as const;

export function isActive(href: string, pathname: string | null): boolean {
  if (pathname === null) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Selve menyen. `pathname = null` gir meny uten markert punkt (brukes som Suspense-fallback).
 * `account` er innlogging/utlogging (Story 5.13): ved logoen på mobil, sist i raden på desktop.
 */
export function TopNavView({
  pathname,
  account = null,
}: {
  pathname: string | null;
  account?: ReactNode;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <Link href="/" className={styles.logo}>
            RecipeMate
          </Link>
          <div className={styles.account}>{account}</div>
        </div>
        <nav aria-label="Hovedmeny">
          <ul className={styles.list}>
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href, pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={styles.link}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}

export default function TopNav({ account = null }: { account?: ReactNode }) {
  const pathname = usePathname();
  return <TopNavView pathname={pathname} account={account} />;
}
