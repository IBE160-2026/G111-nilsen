import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Prosjektmappen er roten, så Next ikke leser en package-lock.json høyere opp (for eksempel i hjemmemappen).
  turbopack: { root: fileURLToPath(new URL(".", import.meta.url)) },
  // Siden het tidligere /samlingen; gamle bokmerker sendes videre.
  async redirects() {
    return [{ source: "/samlingen", destination: "/oppskrifter", permanent: false }];
  },
};

export default nextConfig;
