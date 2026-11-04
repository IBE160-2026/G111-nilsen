import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

// AD-9: miljøvariabler leses bare i src/server/config.ts.
const root = process.cwd();

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (!/\.(ts|tsx)$/.test(entry.name) || /\.test\.(ts|tsx)$/.test(entry.name)) return [];
    return [path];
  });
}

describe("AD-9: tilgang til miljøvariabler", () => {
  it("bare src/server/config.ts bruker process.env", () => {
    const users = sourceFiles(join(root, "src"))
      .filter((file) => readFileSync(file, "utf8").includes("process.env"))
      .map((file) => relative(root, file).split(sep).join("/"));
    expect(users).toEqual(["src/server/config.ts"]);
  });
});
