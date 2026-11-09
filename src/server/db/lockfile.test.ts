import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Se issues/004-better-sqlite3-bygges-fra-kildekode.md. better-sqlite3 har ferdigbygde
// binærfiler for alle plattformer og `"gypfile": false` i sin package.json, men npm
// lagrer ikke det feltet i package-lock.json. Uten det i låsefila kjører `npm ci` og
// `npm install` i en ny klone `node-gyp rebuild`, som krever kompilator og nett mot
// nodejs.org. Når npm skriver låsefila på nytt, forsvinner feltet og må legges inn igjen:
//
//   node -e 'const f="package-lock.json",fs=require("fs"),l=JSON.parse(fs.readFileSync(f));l.packages["node_modules/better-sqlite3"].gypfile=false;fs.writeFileSync(f,JSON.stringify(l,null,2)+"\n")'
describe("package-lock.json", () => {
  it('better-sqlite3 har "gypfile": false, så ny klone ikke bygger fra kildekode', () => {
    const lock = JSON.parse(readFileSync(join(process.cwd(), "package-lock.json"), "utf8"));
    expect(lock.packages["node_modules/better-sqlite3"]?.gypfile).toBe(false);
  });
});
