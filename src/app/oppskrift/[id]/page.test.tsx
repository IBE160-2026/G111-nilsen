// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, type Db, TEST_USER_ID } from "@/server/db/client";
import { createFolder, moveRecipeToFolder } from "@/server/services/folder-service";
import { createManualRecipe } from "@/server/services/recipe-service";

const session = vi.hoisted(() => ({ userId: 1 as number | null }));
vi.mock("@/server/session", () => ({
  currentUserId: async () => session.userId,
  currentUser: async () =>
    session.userId === null ? null : { id: session.userId, email: "test@example.com" },
}));

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
    getRecipeFor: (...args: Parameters<typeof actual.getRecipeFor>) =>
      state.forcedErrorKind
        ? { ok: false, error: { kind: state.forcedErrorKind } }
        : actual.getRecipeFor(...args),
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
      TEST_USER_ID,
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
      TEST_USER_ID,
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

  it("sender mappene og oppskriftens mappe til lagre-linjen", async () => {
    const created = createManualRecipe(
      TEST_USER_ID,
      { title: "Pannekaker", servings: 4, ingredients: ["3 egg"], steps: [] },
      state.db!,
    );
    if (!created.ok) throw new Error("kunne ikke lagre");
    createFolder(TEST_USER_ID, "Hverdag", state.db!);
    createFolder(TEST_USER_ID, "Helg", state.db!);
    moveRecipeToFolder(TEST_USER_ID, created.value.id, 2, state.db!);

    render(await renderPage(String(created.value.id)));
    expect(screen.getByRole("button", { name: "Helg, bytt mappe" })).toBeInTheDocument();
  });
});

describe("innlogging og eierskap (Story 5.13)", () => {
  function create(): number {
    const created = createManualRecipe(
      TEST_USER_ID,
      { title: "Pannekaker", servings: 4, ingredients: ["3 egg"], steps: [] },
      state.db!,
    );
    if (!created.ok) throw new Error("kunne ikke lagre");
    return created.value.id;
  }

  it("en annens oppskrift gir ikke funnet", async () => {
    const id = String(create());
    session.userId = Number(
      state
        .db!.$client.prepare(
          "insert into users (email, password_hash, created_at) values ('b@b.no', 'x', 'x')",
        )
        .run().lastInsertRowid,
    );
    try {
      await expect(renderPage(id)).rejects.toBeInstanceOf(NotFoundError);
    } finally {
      session.userId = 1;
    }
  });

  it("en import uten eier vises uten innlogging, med «Logg inn for å lagre»", async () => {
    const id = create();
    state.db!.$client.prepare("update recipes set user_id = null, saved_at = null").run();
    session.userId = null;
    try {
      render(await renderPage(String(id)));
      expect(screen.getByRole("heading", { level: 1, name: "Pannekaker" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Logg inn for å lagre" })).toHaveAttribute(
        "href",
        `/logg-inn?neste=%2Foppskrift%2F${id}`,
      );
    } finally {
      session.userId = 1;
    }
  });
});
