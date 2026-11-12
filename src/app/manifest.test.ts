import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

const root = process.cwd();

describe("appmanifest (Story 6.16)", () => {
  const m = manifest();

  it("kan installeres som en egen norsk app", () => {
    expect(m.name).toBe("RecipeMate");
    expect(m.lang).toBe("nb");
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/oppskrifter");
    expect(m.scope).toBe("/");
  });

  it("bruker fargene fra designtokenene", () => {
    const tokens = readFileSync(join(root, "src/styles/tokens.css"), "utf8");
    expect(tokens).toContain(`--color-surface-base: ${m.background_color}`);
    expect(tokens).toContain(`--color-accent: ${m.theme_color}`);
  });

  it("har ikoner på 192 og 512 piksler, også maskerbart, og filene finnes", () => {
    const sizes = m.icons?.map((icon) => `${icon.sizes}:${icon.purpose}`);
    expect(sizes).toEqual(["192x192:any", "512x512:any", "512x512:maskable"]);
    for (const icon of m.icons ?? []) {
      expect(existsSync(join(root, "public", icon.src)), icon.src).toBe(true);
    }
  });
});
