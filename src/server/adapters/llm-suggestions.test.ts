import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { Recipe } from "@/domain";
import { suggestionsSchema } from "../ports/suggestion-provider";
import {
  buildPrompt,
  createLlmSuggestionProvider,
  DEFAULT_LLM_MODEL,
  LLM_ENDPOINT,
  LLM_RATE_LIMIT,
  stripCodeFence,
} from "./llm-suggestions";

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(join("test", "fixtures", "llm", name), "utf8"));
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const recipe: Recipe = {
  id: 7,
  title: "Løksuppe",
  sourceUrl: null,
  sourceName: null,
  originalServings: 4,
  selectedServings: null,
  savedAt: null,
  folderId: null,
  isFavorite: false,
  createdAt: "2026-11-10T08:00:00.000Z",
  updatedAt: "2026-11-10T08:00:00.000Z",
  ingredients: [
    {
      id: 1,
      position: 0,
      section: null,
      original: "4 løk",
      quantity: null,
      unit: null,
      name: "løk",
      parseable: false,
    },
  ],
  steps: [{ id: 1, position: 0, section: null, text: "Stek løken." }],
  suggestions: [],
};

function providerWith(fetchImpl: typeof fetch, extra: object = {}) {
  return createLlmSuggestionProvider({ apiKey: "test-key", fetchImpl, ...extra });
}

describe("buildPrompt", () => {
  it("har tittel, ingredienslinjer og nummererte steg inne i <oppskrift>", () => {
    const prompt = buildPrompt(recipe);
    expect(prompt).toContain("<oppskrift>");
    expect(prompt).toContain("Tittel: Løksuppe");
    expect(prompt).toContain("- 4 løk");
    expect(prompt).toContain("1. Stek løken.");
  });

  it("kutter svært lange oppskrifter", () => {
    const long = { ...recipe, steps: [{ ...recipe.steps[0], text: "x".repeat(50_000) }] };
    expect(buildPrompt(long).length).toBeLessThan(8_200);
  });
});

describe("stripCodeFence", () => {
  it("fjerner ```json-blokk og lar vanlig tekst stå", () => {
    expect(stripCodeFence("```json\n[1]\n```")).toBe("[1]");
    expect(stripCodeFence("```\n[1]\n```")).toBe("[1]");
    expect(stripCodeFence(" [1] ")).toBe("[1]");
  });
});

describe("createLlmSuggestionProvider (lagrede eksempelsvar, ingen nettverk)", () => {
  it("sender oppskriften til API-et med nøkkel i hodet og gir gyldige forslag uten eksempelmerke", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(fixture("svar-ok.json")));
    const result = await providerWith(fetchImpl as unknown as typeof fetch).suggest(recipe);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.isExample).toBe(false);
    expect(suggestionsSchema.safeParse(result.value.suggestions).success).toBe(true);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(LLM_ENDPOINT);
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("test-key");
    const body = JSON.parse(init.body as string) as {
      model: string;
      messages: { content: string }[];
    };
    expect(body.model).toBe(DEFAULT_LLM_MODEL);
    expect(body.messages[0].content).toContain("Løksuppe");
  });

  it("bruker modellen fra innstillingene", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(fixture("svar-ok.json")));
    await providerWith(fetchImpl as unknown as typeof fetch, { model: "min-modell" }).suggest(
      recipe,
    );
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((JSON.parse(init.body as string) as { model: string }).model).toBe("min-modell");
  });

  it("tåler at modellen la svaret i en kodeblokk", async () => {
    const result = await providerWith((async () =>
      jsonResponse(fixture("svar-kodeblokk.json"))) as unknown as typeof fetch).suggest(recipe);
    expect(result.ok && suggestionsSchema.safeParse(result.value.suggestions).success).toBe(true);
  });

  const failures: [string, () => Promise<Response>, string][] = [
    ["HTTP-feil", async () => jsonResponse({ error: "nøkkelen min: test-key" }, 401), "http_401"],
    [
      "ikke-JSON fra API-et",
      async () => new Response("<html>", { status: 200 }),
      "invalid_response",
    ],
    ["uten innhold", async () => jsonResponse({ content: [] }), "invalid_response"],
    [
      "innhold uten tekst",
      async () => jsonResponse({ content: [{ type: "tool_use" }] }),
      "invalid_response",
    ],
    [
      "tekst som ikke er JSON",
      async () => jsonResponse({ content: [{ type: "text", text: "Beklager, jeg kan ikke." }] }),
      "invalid_json",
    ],
    [
      "nettverksfeil",
      async () => {
        throw new TypeError("fetch failed");
      },
      "network",
    ],
    [
      "tidsavbrudd",
      async () => {
        throw new DOMException("timeout", "TimeoutError");
      },
      "timeout",
    ],
  ];

  it.each(failures)(
    "%s gir suggestion_failed uten å lekke nøkkel eller svartekst",
    async (_n, impl, detail) => {
      const result = await providerWith(vi.fn(impl) as unknown as typeof fetch).suggest(recipe);
      expect(result).toEqual({ ok: false, error: { kind: "suggestion_failed", detail } });
      expect(JSON.stringify(result)).not.toContain("test-key");
    },
  );

  it("returnerer uvalidert innhold; ugyldig form fanges av servicen (skjemaet)", async () => {
    const result = await providerWith((async () =>
      jsonResponse({
        content: [{ type: "text", text: '[{"text":"a"}]' }],
      })) as unknown as typeof fetch).suggest(recipe);
    expect(result.ok && suggestionsSchema.safeParse(result.value.suggestions).success).toBe(false);
  });

  it("stopper etter grensen på kall per minutt, og slipper til igjen når vinduet er gått", async () => {
    let t = 1_000;
    const fetchImpl = vi.fn(async () => jsonResponse(fixture("svar-ok.json")));
    const provider = providerWith(fetchImpl as unknown as typeof fetch, { now: () => t });
    for (let i = 0; i < LLM_RATE_LIMIT.calls; i++) {
      expect((await provider.suggest(recipe)).ok).toBe(true);
    }
    const blocked = await provider.suggest(recipe);
    expect(blocked).toEqual({
      ok: false,
      error: { kind: "suggestion_failed", detail: "rate_limited" },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(LLM_RATE_LIMIT.calls);
    t += LLM_RATE_LIMIT.windowMs;
    expect((await provider.suggest(recipe)).ok).toBe(true);
  });
});
