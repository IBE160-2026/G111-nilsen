import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// AD-1: domenekjernen er ren TypeScript uten rammeverk, server-kode eller I/O.
// Testfilene selv er unntatt, siden de leser filer fra disk.
const domainDir = join(process.cwd(), "src", "domain");

const sourceFiles = readdirSync(domainDir).filter(
  (name) => /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name),
);

const FORBIDDEN = [
  /^next(\/|$)/,
  /^react(-dom)?(\/|$)/,
  /^node:/,
  /^@\/(server|app)(\/|$)/,
  /(^|\/)src\/(server|app)(\/|$)/,
  /^(\.\.\/)+(server|app)(\/|$)/,
  /^(fs|path|http|https|net|child_process|better-sqlite3|drizzle-orm)(\/|$)/,
];

function importsOf(source: string): string[] {
  const specifiers = [
    ...source.matchAll(/\bfrom\s+["']([^"']+)["']/g),
    ...source.matchAll(/\bimport\s*\(?\s*["']([^"']+)["']/g),
    ...source.matchAll(/\brequire\s*\(\s*["']([^"']+)["']/g),
  ];
  return specifiers.map((match) => match[1]);
}

describe("AD-1: ren domenekjerne", () => {
  it("finner domenefilene", () => {
    expect(sourceFiles).toEqual(
      expect.arrayContaining([
        "index.ts",
        "parse-line.ts",
        "parse-quantity.ts",
        "types.ts",
        "units.ts",
      ]),
    );
  });

  it.each(sourceFiles)("%s importerer ikke fra forbudte moduler", (file) => {
    const source = readFileSync(join(domainDir, file), "utf8");
    const forbidden = importsOf(source).filter((spec) => FORBIDDEN.some((re) => re.test(spec)));
    expect(forbidden).toEqual([]);
  });

  it("domenefilene importerer bare fra hverandre", () => {
    for (const file of sourceFiles) {
      const source = readFileSync(join(domainDir, file), "utf8");
      for (const spec of importsOf(source)) expect(spec).toMatch(/^\.\/[\w-]+$/);
    }
  });
});
