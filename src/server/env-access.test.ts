import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

// AD-9: miljøvariabler leses bare i src/server/config.ts. Unntak: instrumentation.ts leser
// Nexts egen `NEXT_RUNTIME` (ikke appens konfigurasjon); Next bytter ut akkurat det uttrykket
// ved bygging, så Node-koden holdes unna Edge-pakken.
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
    expect(users).toEqual(["src/instrumentation.ts", "src/server/config.ts"]);
  });

  it("instrumentation.ts leser bare NEXT_RUNTIME", () => {
    const source = readFileSync(join(root, "src/instrumentation.ts"), "utf8");
    const reads = [...source.matchAll(/process\.env(\.\w+)?/g)].map((match) => match[0]);
    expect(reads).toEqual(["process.env.NEXT_RUNTIME"]);
  });
});
