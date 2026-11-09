import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

// AD-6: utenfor src/server/db/ importerer ingen Drizzle eller better-sqlite3. Innenfor
// er det bare schema, client, migrering og repositoriene som gjør det, og bare
// repositoriene bygger spørringer. De andre får bare bruke oppsettsmodulene under.
const root = process.cwd();

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (!/\.(ts|tsx)$/.test(entry.name) || /\.test\.(ts|tsx)$/.test(entry.name)) return [];
    return [relative(root, path).split(sep).join("/")];
  });
}

/** Alle modulnavn en kildefil henter fra: import, import type, export … from, import(), require(). */
function importsIn(source: string): string[] {
  return [
    ...source.matchAll(/\bfrom\s*["']([^"']+)["']/g),
    ...source.matchAll(/\bimport\s*\(?\s*["']([^"']+)["']/g),
    ...source.matchAll(/\brequire\s*\(\s*["']([^"']+)["']/g),
  ].map((match) => match[1]);
}

const importsOf = (file: string) => importsIn(readFileSync(join(root, file), "utf8"));

const DB_PACKAGE = /^(drizzle-orm|drizzle-kit|better-sqlite3)(\/|$)/;
const SETUP_MODULES = new Set([
  "drizzle-orm/sqlite-core",
  "drizzle-orm/better-sqlite3",
  "drizzle-orm/better-sqlite3/migrator",
  "better-sqlite3",
]);
const SETUP_FILES = new Set([
  "src/server/db/schema.ts",
  "src/server/db/client.ts",
  "src/server/db/migrate.ts",
]);

const files = [...sourceFiles(join(root, "src")), ...sourceFiles(join(root, "scripts"))];

describe("AD-6: Drizzle brukes bare i databaselaget", () => {
  it("finner import i alle former", () => {
    const source = [
      'import { eq } from "drizzle-orm";',
      'import type { SQL } from "drizzle-orm/sql";',
      'export * from "better-sqlite3";',
      'export { x } from "drizzle-kit";',
      'import "drizzle-orm/side-effect";',
      'const m = await import("drizzle-orm/x");',
      'const r = require("better-sqlite3/lib");',
    ].join("\n");
    expect(
      importsIn(source)
        .filter((spec) => DB_PACKAGE.test(spec))
        .sort(),
    ).toEqual(
      [
        "better-sqlite3",
        "better-sqlite3/lib",
        "drizzle-kit",
        "drizzle-orm",
        "drizzle-orm/side-effect",
        "drizzle-orm/sql",
        "drizzle-orm/x",
      ].sort(),
    );
    expect(DB_PACKAGE.test("drizzle-ormish")).toBe(false);
  });

  it("finner databasefilene", () => {
    expect(files).toEqual(
      expect.arrayContaining([...SETUP_FILES, "src/server/db/repositories/recipe-repository.ts"]),
    );
  });

  it("ingen fil utenfor src/server/db/ importerer Drizzle eller better-sqlite3", () => {
    const offenders = files.filter(
      (file) =>
        !file.startsWith("src/server/db/") && importsOf(file).some((s) => DB_PACKAGE.test(s)),
    );
    expect(offenders).toEqual([]);
  });

  it("i src/server/db/ bygger bare repositoriene spørringer", () => {
    const offenders = files
      .filter(
        (file) =>
          file.startsWith("src/server/db/") && !file.startsWith("src/server/db/repositories/"),
      )
      .flatMap((file) =>
        importsOf(file)
          .filter((spec) => DB_PACKAGE.test(spec))
          .filter((spec) => !SETUP_FILES.has(file) || !SETUP_MODULES.has(spec))
          .map((spec) => `${file}: ${spec}`),
      );
    expect(offenders).toEqual([]);
  });
});
