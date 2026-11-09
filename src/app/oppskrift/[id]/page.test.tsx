// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, type Db } from "@/server/db/client";
import { createManualRecipe } from "@/server/services/recipe-service";

const state = vi.hoisted(() => ({ db: null as Db | null, forcedErrorKind: null as string | null }));

vi.mock("@/server/db/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/db/client")>();
  return { ...actual, getDb: () => state.db! };
});

class NotFoundError extends Error {}

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new NotFoundError("NEXT_HTTP_ERROR_FALLBACK;404");
  },
}));

vi.mock("@/server/services/recipe-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/services/recipe-service")>();
  return {
    ...actual,
    getRecipe: (...args: Parameters<typeof actual.getRecipe>) =>
      state.forcedErrorKind
        ? { ok: false, error: { kind: state.forcedErrorKind } }
        : actual.getRecipe(...args),
  };
});

vi.mock("next/server", () => ({ connection: () => Promise.resolve() }));

const { default: RecipePage, generateMetadata } = await import("./page");

afterEach(cleanup);
beforeEach(() => {
  state.db = createTestDb();
  state.forcedErrorKind = null;
});

type AsyncComponent = (props: unknown) => Promise<ReactElement>;

/** Kjører den asynkrone delen inne i Suspense-grensen, slik serveren gjør. */
async function renderPage(id: string): Promise<ReactElement> {
  const page = RecipePage({ params: Promise.resolve({ id }) }) as ReactElement<{
    children: ReactElement;
  }>;
  const loader = page.props.children;
  return (loader.type as AsyncComponent)(loader.props);
}

describe("/oppskrift/[id]", () => {
  it("viser en lagret oppskrift", async () => {
    const created = createManualRecipe(
      { title: "Pannekaker", servings: 4, ingredients: ["3 egg"], steps: [] },
      state.db!,
    );
    if (!created.ok) throw new Error("kunne ikke lagre");

    render(await renderPage(String(created.value.id)));
    expect(screen.getByRole("heading", { level: 1, name: "Pannekaker" })).toBeInTheDocument();
  });

  it.each(["999999", "abc"])("%s fører til notFound()", async (id) => {
    await expect(renderPage(id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("setter oppskriftens tittel som fanetittel", async () => {
    const created = createManualRecipe(
      { title: "Pannekaker", servings: 4, ingredients: ["3 egg"], steps: [] },
      state.db!,
    );
    if (!created.ok) throw new Error("kunne ikke lagre");

    const metadata = await generateMetadata({
      params: Promise.resolve({ id: String(created.value.id) }),
    });
    expect(metadata.title).toBe("Pannekaker");
  });

  it.each(["999999", "abc"])("ukjent id %s gir standardtittel", async (id) => {
    const metadata = await generateMetadata({ params: Promise.resolve({ id }) });
    expect(metadata.title).toBe("Oppskrift");
  });

  it("andre feil enn not_found kastes videre til error.tsx, ikke notFound()", async () => {
    state.forcedErrorKind = "validation";
    const rendering = renderPage("1");
    await expect(rendering).rejects.toThrow(/validation/);
    await expect(rendering).rejects.not.toBeInstanceOf(NotFoundError);
  });
});
