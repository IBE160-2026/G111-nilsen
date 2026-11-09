import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialImportState } from "@/app/_shared/import-form";
import { fallbackMessage, messageFor } from "@/lib/messages";
import { appError, err, ok } from "@/lib/result";
import { createFixtureFetcher } from "@/server/adapters/fixture-fetcher";
import { createTestDb, type Db } from "@/server/db/client";
import type { RecipeSourceFetcher } from "@/server/ports/recipe-source-fetcher";
import { saveRecipeToCollection } from "@/server/services/recipe-service";

const state = vi.hoisted(() => ({
  db: null as Db | null,
  fetcher: null as RecipeSourceFetcher | null,
  revalidated: [] as unknown[][],
  revalidateThrows: false,
}));

vi.mock("@/server/db/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/db/client")>();
  return { ...actual, getDb: () => state.db! };
});

vi.mock("@/server/recipe-fetcher", () => ({ getRecipeFetcher: () => state.fetcher! }));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => {
    if (state.revalidateThrows) throw new Error("revalidering feilet");
    state.revalidated.push(args);
  },
}));

class RedirectError extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT ${url}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));

const { importFromUrl, submitImport } = await import("./actions");

const MATPRAT = "https://www.matprat.no/oppskrifter/familien/rundstykker/";

function rows(): number {
  return (state.db!.$client.prepare("select count(*) as n from recipes").get() as { n: number }).n;
}

function form(url: unknown): FormData {
  const data = new FormData();
  if (url !== undefined) data.set("url", url as string);
  return data;
}

beforeEach(() => {
  state.db = createTestDb();
  state.fetcher = createFixtureFetcher();
  state.revalidated = [];
});

describe("importFromUrl: revalidering", () => {
  it("en feil ved revalidering gir ikke importfeil: brukeren sendes til oppskriften", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    state.revalidateThrows = true;
    await expect(importFromUrl(MATPRAT)).rejects.toBeInstanceOf(RedirectError);
    state.revalidateThrows = false;
  });
});

describe("importFromUrl", () => {
  it("suksess: revaliderer og sender brukeren til oppskriften (redirect kastes)", async () => {
    await expect(importFromUrl(MATPRAT)).rejects.toMatchObject({ url: "/oppskrift/1" });
    expect(state.revalidated).toEqual([["/", "layout"]]);
    expect(rows()).toBe(1);
  });

  it.each([
    ["ugyldig lenke", "hei", "invalid_url"],
    ["tom lenke", "", "invalid_url"],
    ["lenke over grensen", `https://a.no/${"x".repeat(20_000)}`, "invalid_url"],
    ["ukjent side i demoen", "https://www.ukjent.no/x", "fetch_failed"],
    ["lokal adresse", "http://127.0.0.1/", "fetch_failed"],
    [
      "side uten oppskrift",
      "https://www.klikk.no/mat/spise/oppskrift-pa-farikal-2530170",
      "no_recipe",
    ],
  ])("%s: norsk melding fra messageFor, ingenting lagres", async (_name, url, kind) => {
    const result = await importFromUrl(url);
    const message = messageFor(kind);
    expect(result).toEqual({ ok: false, kind, title: message.title, body: message.body });
    expect(state.revalidated).toEqual([]);
    expect(rows()).toBe(0);
  });

  it("duplicate gir recipeId til lenken «Åpne oppskriften»", async () => {
    await expect(importFromUrl(MATPRAT)).rejects.toBeInstanceOf(RedirectError);
    expect(saveRecipeToCollection(1, state.db!).ok).toBe(true);
    const spy = vi.fn();
    state.fetcher = { fetch: spy };
    const result = await importFromUrl(`${MATPRAT}?utm_source=x#del`);
    expect(result).toMatchObject({ ok: false, kind: "duplicate", recipeId: 1 });
    expect(result.title).toBe(messageFor("duplicate").title);
    expect(spy).not.toHaveBeenCalled();
  });

  it.each([null, undefined, 42, {}, ["https://a.no"]])(
    "input som ikke er tekst (%j) gir invalid_url",
    async (value) => {
      const result = await importFromUrl(value as unknown as string);
      expect(result).toMatchObject({ ok: false, kind: "invalid_url" });
    },
  );

  it("uventet feil: reservemeldingen, logges, kaster aldri til klienten", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    state.fetcher = {
      fetch: async () => {
        throw new Error("brudd på porten");
      },
    };
    const result = await importFromUrl("https://a.no/x");
    expect(result).toEqual({
      ok: false,
      kind: "unknown",
      title: fallbackMessage.title,
      body: fallbackMessage.body,
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("feil fra adapteren: fetch_failed og no_recipe vises med riktig tekst", async () => {
    state.fetcher = { fetch: async () => err(appError("no_recipe", "not_html")) };
    expect(await importFromUrl("https://a.no/x")).toMatchObject({ kind: "no_recipe" });
    state.fetcher = { fetch: async () => err(appError("fetch_failed")) };
    expect(await importFromUrl("https://a.no/y")).toMatchObject({ kind: "fetch_failed" });
    state.fetcher = { fetch: async (url) => ok({ html: "", finalUrl: url }) };
    expect(await importFromUrl("https://a.no/z")).toMatchObject({ kind: "no_recipe" });
  });
});

describe("submitImport (skjemaversjonen)", () => {
  it("feil: lenken står igjen i tilstanden og forsøk telles opp", async () => {
    const first = await submitImport(initialImportState, form("  hei  "));
    expect(first.url).toBe("  hei  ");
    expect(first.attempt).toBe(1);
    expect(first.error).toMatchObject({ kind: "invalid_url" });
    const second = await submitImport(first, form("hei"));
    expect(second.attempt).toBe(2);
  });

  it("suksess sender videre", async () => {
    await expect(submitImport(initialImportState, form(MATPRAT))).rejects.toMatchObject({
      url: "/oppskrift/1",
    });
  });

  it.each([undefined, new Blob(["x"])])(
    "manglende eller ikke-tekst felt gir invalid_url",
    async (value) => {
      const data = new FormData();
      if (value) data.set("url", value as Blob);
      const result = await submitImport(initialImportState, data);
      expect(result.url).toBe("");
      expect(result.error).toMatchObject({ kind: "invalid_url" });
    },
  );
});
