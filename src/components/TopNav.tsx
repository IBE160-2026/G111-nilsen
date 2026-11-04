"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./TopNav.module.css";

export const NAV_ITEMS = [
  { href: "/", label: "Importer" },
  { href: "/samlingen", label: "Samlingen" },
  { href: "/mapper", label: "Mapper" },
  { href: "/favoritter", label: "Favoritter" },
] as const;

export function isActive(href: string, pathname: string | null): boolean {
  if (pathname === null) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Selve menyen. `pathname = null` gir meny uten markert punkt (brukes som Suspense-fallback). */
export function TopNavView({ pathname }: { pathname: string | null }) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          RecipeMate
        </Link>
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

export default function TopNav() {
  const pathname = usePathname();
  return <TopNavView pathname={pathname} />;
}
