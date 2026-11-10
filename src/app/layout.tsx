import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import AccountLink from "@/components/AccountLink";
import TopNav, { TopNavView } from "@/components/TopNav";
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
      </body>
    </html>
  );
}
