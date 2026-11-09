import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

// AD-6: utenfor src/server/db/ importerer ingen Drizzle eller better-sqlite3. Innenfor
// er det bare schema, client, migrering og repositoriene som gjør det, og bare
// repositoriene bygger spørringer (operatorer som eq/and/sql fra «drizzle-orm»).
const root = process.cwd();

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (!/\.(ts|tsx)$/.test(entry.name) || /\.test\.(ts|tsx)$/.test(entry.name)) return [];
    return [relative(root, path).split(sep).join("/")];
  });
}

function importsOf(file: string): string[] {
  const source = readFileSync(join(root, file), "utf8");
  return [
    ...source.matchAll(/\bfrom\s+["']([^"']+)["']/g),
    ...source.matchAll(/\bimport\s*\(?\s*["']([^"']+)["']/g),
    ...source.matchAll(/\brequire\s*\(\s*["']([^"']+)["']/g),
  ].map((match) => match[1]);
}

const DB_PACKAGE = /^(drizzle-orm|drizzle-kit|better-sqlite3)(\/|$)/;
const files = [...sourceFiles(join(root, "src")), ...sourceFiles(join(root, "scripts"))];

describe("AD-6: Drizzle brukes bare i databaselaget", () => {
  it("finner databasefilene", () => {
    expect(files).toEqual(
      expect.arrayContaining([
        "src/server/db/schema.ts",
        "src/server/db/client.ts",
        "src/server/db/migrate.ts",
        "src/server/db/repositories/recipe-repository.ts",
      ]),
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
    const allowed = new Set([
      "src/server/db/schema.ts",
      "src/server/db/client.ts",
      "src/server/db/migrate.ts",
    ]);
    const offenders = files.filter(
      (file) =>
        file.startsWith("src/server/db/") &&
        !file.startsWith("src/server/db/repositories/") &&
        !allowed.has(file) &&
        importsOf(file).some((s) => DB_PACKAGE.test(s)),
    );
    expect(offenders).toEqual([]);
    for (const file of allowed) {
      expect(importsOf(file), file).not.toContain("drizzle-orm");
    }
  });
});
