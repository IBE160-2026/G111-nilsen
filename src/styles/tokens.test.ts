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
    expect(Object.keys(designColors).length).toBe(20);
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

  it("avkrysningsboksen er 24 px og har tokens for hjørner, kant og hake", () => {
    expect(tokens).toContain("--checkbox-size: 24px;");
    for (const name of ["radius", "border-width", "check-stroke"]) {
      expect(tokens).toMatch(new RegExp(`--checkbox-${name}: [0-9.]+px;`));
    }
  });

  it("CheckRow.module.css bruker tokens: ingen hex-farger eller px-verdier", () => {
    const css = readFileSync(join(root, "src/components/CheckRow.module.css"), "utf8");
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/\d\s*px\b/);
    expect(css).toContain(":focus-visible");
    expect(css).toContain("forced-colors: active");
    expect(css).toContain("var(--checkbox-size)");
    expect(css).toContain("var(--tap-target-min)");
    expect(css).toContain("var(--color-on-accent)");
  });
});
