import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import AccountLink from "@/components/AccountLink";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import TopNav, { TopNavView } from "@/components/TopNav";
import { config } from "@/server/config";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "RecipeMate",
    template: "%s · RecipeMate",
  },
  description: "Hent oppskrifter fra nettet, se dem i et ryddig format og skaler mengdene.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Adresselinjen på telefonen følger fargene i appen (Story 6.16).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#b8432f" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1814" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb">
      <body>
        {/* Suspense: usePathname kan suspendere på dynamiske ruter når cacheComponents er på. */}
        <Suspense fallback={<TopNavView pathname={null} />}>
          <TopNav
            account={
              // Leser innloggingscookien, så den har sin egen grense (Story 5.13).
              <Suspense fallback={null}>
                <AccountLink />
              </Suspense>
            }
          />
        </Suspense>
        <main className="page">{children}</main>
        <ServiceWorkerRegister enabled={config.isProduction} />
      </body>
    </html>
  );
}
