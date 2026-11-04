import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// AD-1: domenekjernen er ren TypeScript uten rammeverk, server-kode eller I/O.
// Testfilene selv er unntatt, siden de leser filer fra disk.
const domainDir = dirname(fileURLToPath(import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (!/\.(ts|tsx)$/.test(entry.name) || /\.test\.(ts|tsx)$/.test(entry.name)) return [];
    return [path];
  });
}

const files = sourceFiles(domainDir).map((path) => relative(domainDir, path).split(sep).join("/"));

const FORBIDDEN = [
  /^next(\/|$)/,
  /^react(-dom)?(\/|$)/,
  /^node:/,
  /^@\/(server|app)(\/|$)/,
  /(^|\/)src\/(server|app)(\/|$)/,
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

function isInsideDomain(file: string, spec: string): boolean {
  if (!/^\.\.?\//.test(spec)) return false;
  const target = resolve(domainDir, dirname(file), spec);
  return target === domainDir || target.startsWith(domainDir + sep);
}

describe("AD-1: ren domenekjerne", () => {
  it("finner domenefilene", () => {
    expect(files).toEqual(
      expect.arrayContaining([
        "index.ts",
        "parse-line.ts",
        "parse-quantity.ts",
        "types.ts",
        "units.ts",
      ]),
    );
  });

  it.each(files)("%s importerer ikke fra forbudte moduler", (file) => {
    const source = readFileSync(join(domainDir, file), "utf8");
    const forbidden = importsOf(source).filter((spec) => FORBIDDEN.some((re) => re.test(spec)));
    expect(forbidden).toEqual([]);
  });

  it.each(files)("%s importerer bare fra filer i src/domain", (file) => {
    const source = readFileSync(join(domainDir, file), "utf8");
    const outside = importsOf(source).filter((spec) => !isInsideDomain(file, spec));
    expect(outside).toEqual([]);
  });
});
