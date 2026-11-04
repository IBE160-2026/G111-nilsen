import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Matrise: Mørk modus. Fargene i tokens.css skal være de samme som i DESIGN.md (lys og mørk).
const root = process.cwd();
const tokens = readFileSync(join(root, "src/styles/tokens.css"), "utf8").toLowerCase();
const design = readFileSync(
  join(root, "_bmad-output/planning-artifacts/ux-designs/ux-RecipeMate-2026-11-04/DESIGN.md"),
  "utf8",
);

const designColors = Object.fromEntries(
  [...design.matchAll(/^\s{2}([a-z-]+):\s*'(#[0-9A-Fa-f]{6})'/gm)].map((m) => [
    m[1],
    m[2].toLowerCase(),
  ]),
);
const [lightBlock, darkBlock] = tokens.split("@media (prefers-color-scheme: dark)");

describe("designtokens (DESIGN.md)", () => {
  it("leser fargene fra DESIGN.md", () => {
    expect(Object.keys(designColors).length).toBe(18);
  });

  it.each(Object.entries(designColors).filter(([name]) => !name.endsWith("-dark")))(
    "lys palett: --color-%s er %s",
    (name, hex) => {
      expect(lightBlock).toContain(`--color-${name}: ${hex};`);
    },
  );

  it.each(Object.entries(designColors).filter(([name]) => name.endsWith("-dark")))(
    "mørk palett: %s er %s under prefers-color-scheme: dark",
    (name, hex) => {
      expect(darkBlock).toBeDefined();
      expect(darkBlock).toContain(`--color-${name.replace(/-dark$/, "")}: ${hex};`);
    },
  );

  it("trykkflater er minst 44 px", () => {
    expect(tokens).toContain("--tap-target-min: 44px;");
  });
});
