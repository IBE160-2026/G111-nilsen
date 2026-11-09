import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { appError, err, ok, type AppError, type Result } from "@/lib/result";
import { normalizeSourceUrl } from "@/lib/source-url";
import type { FetchedPage, RecipeSourceFetcher } from "../ports/recipe-source-fetcher";

/** Mappen med lagrede sider og tabellen `sources.md`. Relativ til prosjektroten. */
export const DEFAULT_FIXTURE_DIR = join("test", "fixtures");

/**
 * Leser tabellen i `sources.md`: første kolonne er filnavnet i backticks, andre kolonne er
 * URL-en. Nøkkelen er den normaliserte URL-en, så fragment og sporingsparametere ikke teller.
 */
export function parseSourcesTable(markdown: string): Map<string, string> {
  const files = new Map<string, string>();
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.trimStart().startsWith("|")) continue;
    const cells = line.split("|").map((cell) => cell.trim());
    const file = /^`([^`/\\]+\.html)`$/.exec(cells[1] ?? "")?.[1];
    const url = /^https?:\/\/\S+$/.exec(cells[2] ?? "")?.[0];
    if (file && url) files.set(normalizeSourceUrl(url), file);
  }
  return files;
}

/**
 * Fixture-adapteren (AD-4, AD-11): leser lagrede sider fra `test/fixtures/html/` og slår opp
 * filen fra URL-en via tabellen i `test/fixtures/sources.md`. Ukjent URL gir `fetch_failed`.
 * Ingen nettverk. Brukes av tester og demo (`IMPORT_SOURCE=fixtures`).
 */
export function createFixtureFetcher(
  fixtureDir: string = join(process.cwd(), DEFAULT_FIXTURE_DIR),
): RecipeSourceFetcher {
  return {
    async fetch(url): Promise<Result<FetchedPage, AppError>> {
      try {
        const table = parseSourcesTable(await readFile(join(fixtureDir, "sources.md"), "utf8"));
        const file = table.get(normalizeSourceUrl(url));
        if (!file) return err(appError("fetch_failed", "unknown_fixture"));
        const html = await readFile(join(fixtureDir, "html", file), "utf8");
        return ok({ html, finalUrl: url });
      } catch {
        return err(appError("fetch_failed"));
      }
    },
  };
}
