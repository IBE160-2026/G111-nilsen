import type { MetadataRoute } from "next";
import { pwaMessages as m } from "@/lib/messages";

/**
 * Appmanifest (Story 6.16): gjør at RecipeMate kan legges til på hjemskjermen og åpnes som en
 * egen app uten nettleserlinje. Fargene følger designtokenene (`--color-surface-base`,
 * `--color-accent`).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: m.appName,
    short_name: m.appName,
    description: m.appDescription,
    lang: "nb",
    start_url: "/oppskrifter",
    scope: "/",
    display: "standalone",
    background_color: "#fbf7f0",
    theme_color: "#b8432f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
