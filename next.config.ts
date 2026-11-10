import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Siden het tidligere /samlingen; gamle bokmerker sendes videre.
  async redirects() {
    return [{ source: "/samlingen", destination: "/oppskrifter", permanent: false }];
  },
};

export default nextConfig;
