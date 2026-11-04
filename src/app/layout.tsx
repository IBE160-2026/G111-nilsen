import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
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
          <TopNav />
        </Suspense>
        <main className="page">{children}</main>
      </body>
    </html>
  );
}
