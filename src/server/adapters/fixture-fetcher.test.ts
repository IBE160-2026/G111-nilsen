import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createFixtureFetcher, parseSourcesTable } from "./fixture-fetcher";

describe("parseSourcesTable", () => {
  it("leser filnavn i backticks og URL fra tabellraden, og hopper over resten", () => {
    const table = parseSourcesTable(
      [
        "# Kilder",
        "| Fil | Kilde | Språk |",
        "|---|---|---|",
        "| `a.html` | https://www.a.no/x?utm_source=z#f | nb | Notat |",
        "| `b.html` | https://b.no | en | |",
        "| `ikke-html.txt` | https://c.no/ | nb | |",
        "| `d.html` | ikke en url | nb | |",
        "| uten backticks | https://e.no/ | nb | |",
        "| `../snik.html` | https://f.no/ | nb | |",
        "Tekst utenfor tabellen `g.html` https://g.no/",
      ].join("\n"),
    );
    expect([...table]).toEqual([
      ["https://www.a.no/x", "a.html"],
      ["https://b.no/", "b.html"],
    ]);
  });
});

describe("createFixtureFetcher (prosjektets egne testdata)", () => {
  const fetcher = createFixtureFetcher();

  it("slår opp siden via sources.md og returnerer filens HTML", async () => {
    const result = await fetcher.fetch(
      "https://www.tine.no/oppskrifter/middag-og-hovedretter/kjott/kjottboller-i-tomatsaus",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.html).toContain("Kjøttboller i tomatsaus");
    expect(result.value.finalUrl).toBe(
      "https://www.tine.no/oppskrifter/middag-og-hovedretter/kjott/kjottboller-i-tomatsaus",
    );
  });

  it.each([
    [
      "matprat-rundstykker",
      "https://www.matprat.no/oppskrifter/familien/rundstykker/",
      "Rundstykker",
    ],
    [
      "godt-amerikanske-pannekaker",
      "https://www.godt.no/oppskrifter/pannekaker-og-vafler/155/amerikanske-pannekaker",
      "Amerikanske pannekaker",
    ],
  ])("%s finnes i tabellen", async (_name, url, title) => {
    const result = await fetcher.fetch(url);
    expect(result.ok && result.value.html).toContain(title);
  });

  it("sammenligner på normalisert URL: fragment, sporing og store bokstaver i vert teller ikke", async () => {
    const result = await fetcher.fetch(
      "HTTPS://WWW.matprat.no/oppskrifter/familien/rundstykker/?utm_source=x#top",
    );
    expect(result.ok).toBe(true);
  });

  it("ukjent URL gir fetch_failed", async () => {
    expect(await fetcher.fetch("https://www.ukjent.no/oppskrift")).toEqual({
      ok: false,
      error: { kind: "fetch_failed", detail: "unknown_fixture" },
    });
  });

  it("ulik sti (store/små bokstaver og avsluttende /) er ukjent", async () => {
    const miss = await fetcher.fetch("https://www.matprat.no/oppskrifter/familien/rundstykker");
    expect(miss.ok).toBe(false);
    const caps = await fetcher.fetch("https://www.matprat.no/oppskrifter/familien/Rundstykker/");
    expect(caps.ok).toBe(false);
  });

  it("alle sidene i tabellen finnes som filer", async () => {
    const { readFileSync, existsSync } = await import("node:fs");
    const table = parseSourcesTable(readFileSync("test/fixtures/sources.md", "utf8"));
    expect(table.size).toBeGreaterThanOrEqual(10);
    for (const file of table.values()) {
      expect(existsSync(join("test/fixtures/html", file)), file).toBe(true);
    }
  });
});

describe("createFixtureFetcher (egen mappe)", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });
  function makeDir(sources: string | null, files: Record<string, string>) {
    const dir = mkdtempSync(join(tmpdir(), "recipemate-fixtures-"));
    dirs.push(dir);
    mkdirSync(join(dir, "html"));
    if (sources !== null) writeFileSync(join(dir, "sources.md"), sources);
    for (const [name, content] of Object.entries(files))
      writeFileSync(join(dir, "html", name), content);
    return dir;
  }

  it("leser filen fra tabellen", async () => {
    const dir = makeDir("| `x.html` | https://x.no/a | nb |", { "x.html": "<p>x</p>" });
    expect(await createFixtureFetcher(dir).fetch("https://x.no/a")).toEqual({
      ok: true,
      value: { html: "<p>x</p>", finalUrl: "https://x.no/a" },
    });
  });

  it("fil i tabellen som mangler på disk gir fetch_failed", async () => {
    const dir = makeDir("| `mangler.html` | https://x.no/a | nb |", {});
    expect(await createFixtureFetcher(dir).fetch("https://x.no/a")).toEqual({
      ok: false,
      error: { kind: "fetch_failed" },
    });
  });

  it("manglende sources.md gir fetch_failed og kaster ikke", async () => {
    const dir = makeDir(null, {});
    expect((await createFixtureFetcher(dir).fetch("https://x.no/a")).ok).toBe(false);
    expect((await createFixtureFetcher(join(dir, "finnes-ikke")).fetch("https://x.no/a")).ok).toBe(
      false,
    );
  });

  it("filnavn med sti ut av mappen leses aldri", async () => {
    const dir = makeDir("| `../sources.md` | https://x.no/a | nb |", {});
    expect((await createFixtureFetcher(dir).fetch("https://x.no/a")).ok).toBe(false);
  });
});
