import { describe, expect, it, vi } from "vitest";
import { parseLine, type Recipe } from "@/domain";
import { LLM_ENDPOINT, LLM_RATE_LIMIT } from "./llm-suggestions";
import { buildTranslationPrompt, createLlmTranslationProvider } from "./llm-translation";

const recipe = {
  id: 1,
  title: "Cinnamon rolls",
  ingredients: [
    { ...parseLine("2 cups flour"), id: 2, position: 1, section: "Dough" },
    { ...parseLine("1 cup sugar"), id: 1, position: 0, section: null },
  ],
  steps: [{ id: 1, position: 0, section: "Dough", text: "Mix." }],
} as unknown as Recipe;

const reply = (text: string, status = 200) =>
  new Response(JSON.stringify({ content: [{ type: "text", text }] }), { status });

describe("buildTranslationPrompt", () => {
  it("gir linjene i lagret rekkefølge, og delnavnene en gang", () => {
    const prompt = buildTranslationPrompt(recipe);
    const body = JSON.parse(prompt.replace(/^<oppskrift>\n|\n<\/oppskrift>$/g, ""));
    expect(body).toEqual({
      title: "Cinnamon rolls",
      ingredients: ["1 cup sugar", "2 cups flour"],
      steps: ["Mix."],
      sections: ["Dough"],
    });
  });
});

describe("createLlmTranslationProvider", () => {
  it("sender et kall med nøkkel og gir det tolkede svaret uvalidert tilbake", async () => {
    const fetchImpl = vi.fn(async () => reply('```json\n{"title":"Kanelboller"}\n```'));
    const provider = createLlmTranslationProvider({ apiKey: "nøkkel", fetchImpl });
    expect(await provider.translate(recipe)).toEqual({ ok: true, value: { title: "Kanelboller" } });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(LLM_ENDPOINT);
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("nøkkel");
  });

  it.each([
    ["http", async () => reply("x", 500), "http_500"],
    ["nett", async () => Promise.reject(new Error("nede")), "network"],
    ["ugyldig json", async () => reply("ikke json"), "invalid_json"],
  ])("feil gir translation_failed (%s)", async (_name, impl, detail) => {
    const provider = createLlmTranslationProvider({ apiKey: "k", fetchImpl: impl as typeof fetch });
    expect(await provider.translate(recipe)).toEqual({
      ok: false,
      error: { kind: "translation_failed", detail },
    });
  });

  it("tidsavbrudd gir timeout, og nøkkelen havner ikke i feildetaljen", async () => {
    const impl = async () => {
      throw Object.assign(new Error("x"), { name: "TimeoutError" });
    };
    const provider = createLlmTranslationProvider({
      apiKey: "hemmelig",
      fetchImpl: impl as unknown as typeof fetch,
    });
    const result = await provider.translate(recipe);
    expect(result).toEqual({
      ok: false,
      error: { kind: "translation_failed", detail: "timeout" },
    });
    expect(JSON.stringify(result)).not.toContain("hemmelig");
  });

  it("grensen mot gjentatte kall gir rate_limited", async () => {
    const fetchImpl = vi.fn(async () => reply("{}"));
    const provider = createLlmTranslationProvider({ apiKey: "k", fetchImpl, now: () => 0 });
    for (let i = 0; i < LLM_RATE_LIMIT.calls; i++) await provider.translate(recipe);
    expect(await provider.translate(recipe)).toEqual({
      ok: false,
      error: { kind: "translation_failed", detail: "rate_limited" },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(LLM_RATE_LIMIT.calls);
  });
});
