import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Matrise: Smal skjerm. Under 768 px ligger logo og meny på hver sin linje (kolonne);
// fra 768 px på én linje. Menypunktene bruker minstehøyden for trykkflater.
const css = readFileSync(join(process.cwd(), "src/components/TopNav.module.css"), "utf8");
const [base, wide] = css.split("@media (min-width: 768px)");

describe("TopNav-oppsett", () => {
  it("er to linjer (kolonne) som standard, altså på smal skjerm", () => {
    expect(base).toMatch(/\.inner\s*{[^}]*flex-direction:\s*column/);
  });

  it("blir én linje fra 768 px", () => {
    expect(wide).toBeDefined();
    expect(wide).toMatch(/\.inner\s*{[^}]*flex-direction:\s*row/);
  });

  it("menypunktene har minstehøyde for trykkflater", () => {
    expect(base).toMatch(/\.link\s*{[^}]*min-height:\s*var\(--tap-target-min\)/);
  });
});
