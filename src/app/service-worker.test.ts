import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");

describe("service worker (Story 6.16)", () => {
  it("lagrer bare statiske filer og den frakoblede siden", () => {
    expect(source).toContain('url.pathname.startsWith("/_next/static/")');
    expect(source).toContain('const OFFLINE_URL = "/frakoblet"');
    // Bare statiske filer (også de frakoblet-siden bruker) og frakoblet-siden lagres.
    expect(source.match(/(cache|offline|statics)\.(put|add)\(/g)).toEqual([
      "offline.put(",
      "statics.add(",
      "cache.put(",
    ]);
  });

  it("rører ikke andre enn GET-forespørsler til samme opprinnelse", () => {
    expect(source).toContain('request.method !== "GET"');
    expect(source).toContain("url.origin !== self.location.origin");
  });
});
