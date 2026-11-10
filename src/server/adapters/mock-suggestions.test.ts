import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Recipe } from "@/domain";
import { suggestionsSchema } from "../ports/suggestion-provider";
import { createMockSuggestionProvider, DEFAULT_SUGGESTION_FIXTURE_DIR } from "./mock-suggestions";

function recipe(id: number): Recipe {
  return {
    id,
    title: "Pannekaker",
    sourceUrl: null,
    sourceName: null,
    originalServings: 4,
    selectedServings: null,
    savedAt: null,
    folderId: null,
    isFavorite: false,
    createdAt: "2026-11-10T08:00:00.000Z",
    updatedAt: "2026-11-10T08:00:00.000Z",
    ingredients: [],
    steps: [],
    suggestions: [],
  };
}

describe("fixture-filene (prosjektets egne eksempelsvar)", () => {
  const files = readdirSync(DEFAULT_SUGGESTION_FIXTURE_DIR).filter((f) => f.endsWith(".json"));

  it("finnes, og gir sett med ulik lengde", () => {
    expect(files.length).toBeGreaterThanOrEqual(3);
  });

  it.each(files)("%s er gyldig mot skjemaet (1–3 forslag)", (file) => {
    const parsed: unknown = JSON.parse(
      readFileSync(join(DEFAULT_SUGGESTION_FIXTURE_DIR, file), "utf8"),
    );
    expect(suggestionsSchema.safeParse(parsed).success).toBe(true);
  });
});

describe("createMockSuggestionProvider (prosjektets egne eksempelsvar)", () => {
  const provider = createMockSuggestionProvider();

  it("gir gyldige forslag merket som eksempel", async () => {
    const result = await provider.suggest(recipe(1));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.isExample).toBe(true);
    expect(suggestionsSchema.safeParse(result.value.suggestions).success).toBe(true);
  });

  it("gir samme forslag for samme oppskrift, og ulike sett for ulike id-er", async () => {
    const again = await provider.suggest(recipe(1));
    const first = await provider.suggest(recipe(1));
    expect(again).toEqual(first);
    const sizes = new Set<number>();
    for (const id of [1, 2, 3]) {
      const result = await provider.suggest(recipe(id));
      if (result.ok) sizes.add((result.value.suggestions as unknown[]).length);
    }
    expect(sizes.size).toBeGreaterThan(1);
  });
});

describe("createMockSuggestionProvider (midlertidige mapper)", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  function tempDir(): string {
    const dir = mkdtempSync(join(tmpdir(), "forslag-"));
    dirs.push(dir);
    return dir;
  }

  it("velger fil ut fra id modulo antall filer, sortert på navn", async () => {
    const dir = tempDir();
    writeFileSync(join(dir, "b.json"), JSON.stringify([{ marker: "b" }]));
    writeFileSync(join(dir, "a.json"), JSON.stringify([{ marker: "a" }]));
    writeFileSync(join(dir, "notat.txt"), "ikke json-fil");
    const provider = createMockSuggestionProvider(dir);
    const marker = async (id: number) => {
      const result = await provider.suggest(recipe(id));
      return result.ok ? (result.value.suggestions as { marker: string }[])[0].marker : null;
    };
    expect([await marker(2), await marker(3), await marker(4)]).toEqual(["a", "b", "a"]);
  });

  it("gir suggestion_failed når mappen mangler", async () => {
    const result = await createMockSuggestionProvider(join(tempDir(), "finnes-ikke")).suggest(
      recipe(1),
    );
    expect(result).toEqual({
      ok: false,
      error: { kind: "suggestion_failed", detail: "unreadable_fixture" },
    });
  });

  it("gir suggestion_failed når mappen er tom", async () => {
    const result = await createMockSuggestionProvider(tempDir()).suggest(recipe(1));
    expect(result).toEqual({
      ok: false,
      error: { kind: "suggestion_failed", detail: "no_fixtures" },
    });
  });

  it("gir suggestion_failed når filen ikke er gyldig JSON", async () => {
    const dir = tempDir();
    writeFileSync(join(dir, "a.json"), "{ ikke json");
    const result = await createMockSuggestionProvider(dir).suggest(recipe(1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("suggestion_failed");
  });

  it("gir suggestion_failed når en .json-oppføring er en mappe", async () => {
    const dir = tempDir();
    mkdirSync(join(dir, "a.json"));
    const result = await createMockSuggestionProvider(dir).suggest(recipe(1));
    expect(result.ok).toBe(false);
  });
});
