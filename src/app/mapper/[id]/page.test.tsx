// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, type Db, TEST_USER_ID } from "@/server/db/client";
import { insertRecipe, type NewRecipe } from "@/server/db/repositories/recipe-repository";
import { createFolder, moveRecipeToFolder } from "@/server/services/folder-service";
import { setFavorite } from "@/server/services/recipe-service";

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

vi.mock("@/server/services/folder-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/services/folder-service")>();
  return {
    ...actual,
    getFolderWithRecipes: (...args: Parameters<typeof actual.getFolderWithRecipes>) =>
      state.forcedErrorKind
        ? { ok: false, error: { kind: state.forcedErrorKind } }
        : actual.getFolderWithRecipes(...args),
  };
});

vi.mock("@/app/oppskrift/[id]/actions", () => ({ setFavorite: vi.fn() }));
vi.mock("next/server", () => ({ connection: () => Promise.resolve() }));

const { default: FolderPage, generateMetadata } = await import("./page");
const { default: FolderNotFound } = await import("./not-found");

afterEach(cleanup);
beforeEach(() => {
  state.db = createTestDb();
  state.forcedErrorKind = null;
});

const recipe = (title: string, savedAt: string, extra: Partial<NewRecipe> = {}): NewRecipe => ({
  title,
  sourceUrl: null,
  sourceName: null,
  originalServings: 4,
  selectedServings: null,
  savedAt,
  createdAt: savedAt,
  updatedAt: savedAt,
  userId: TEST_USER_ID,
  ingredients: [],
  steps: [],
  ...extra,
});

type AsyncComponent = (props: unknown) => Promise<ReactElement>;

async function renderPage(id: string): Promise<ReactElement> {
  const page = FolderPage({ params: Promise.resolve({ id }) }) as ReactElement<{
    children: ReactElement;
  }>;
  const loader = page.props.children;
  return (loader.type as AsyncComponent)(loader.props);
}

describe("/mapper/[id]", () => {
  it("viser mappenavnet, lenken «Alle mapper» og kortene sist lagret først, uten mappenavn på kortene", async () => {
    createFolder(TEST_USER_ID, "Hverdag", state.db!);
    const old = insertRecipe(
      state.db!,
      recipe("Eldst", "2026-11-09T09:00:00.000Z", { sourceName: "Matprat" }),
    );
    const recent = insertRecipe(state.db!, recipe("Nyest", "2026-11-09T11:00:00.000Z"));
    insertRecipe(state.db!, recipe("Utenfor", "2026-11-09T12:00:00.000Z"));
    moveRecipeToFolder(TEST_USER_ID, old, 1, state.db!);
    moveRecipeToFolder(TEST_USER_ID, recent, 1, state.db!);

    render(await renderPage("1"));
    expect(screen.getByRole("heading", { level: 1, name: "Hverdag" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Alle mapper" })).toHaveAttribute("href", "/mapper");
    const list = screen.getByRole("list");
    expect(list).toHaveAttribute("role", "list");
    const items = within(list).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual(["NyestLagt inn selv", "EldstMatprat"]);
    expect(within(items[0]).getByRole("link")).toHaveAttribute("href", `/oppskrift/${recent}`);
    expect(screen.queryByText("Utenfor")).not.toBeInTheDocument();
  });

  it("kortene i mappen har hjerte som viser favorittstatus (Story 3.4)", async () => {
    createFolder(TEST_USER_ID, "Hverdag", state.db!);
    const a = insertRecipe(state.db!, recipe("Favoritten", "2026-11-09T11:00:00.000Z"));
    const b = insertRecipe(state.db!, recipe("Vanlig", "2026-11-09T10:00:00.000Z"));
    moveRecipeToFolder(TEST_USER_ID, a, 1, state.db!);
    moveRecipeToFolder(TEST_USER_ID, b, 1, state.db!);
    setFavorite(a, true, state.db!);
    render(await renderPage("1"));
    expect(screen.getByRole("button", { name: "Favoritt: Favoritten" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Favoritt: Vanlig" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("tom mappe: «Mappen er tom.» med forklaring og «Gå til oppskriftene»", async () => {
    createFolder(TEST_USER_ID, "Tom", state.db!);
    render(await renderPage("1"));
    expect(screen.getByRole("heading", { level: 1, name: "Tom" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Mappen er tom." })).toBeInTheDocument();
    expect(screen.getByText("Legg oppskrifter i mappen fra oppskriftssiden.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gå til oppskriftene" })).toHaveAttribute(
      "href",
      "/oppskrifter",
    );
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it.each(["999", "abc", "0", "-1", "1.5"])("%s fører til notFound()", async (id) => {
    await expect(renderPage(id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("andre feil enn not_found kastes videre til error.tsx", async () => {
    state.forcedErrorKind = "unknown";
    const rendering = renderPage("1");
    await expect(rendering).rejects.toThrow(/unknown/);
    await expect(rendering).rejects.not.toBeInstanceOf(NotFoundError);
  });

  it("har en reservetekst mens mappen hentes", () => {
    const page = FolderPage({ params: Promise.resolve({ id: "1" }) }) as ReactElement<{
      fallback: ReactElement;
    }>;
    render(page.props.fallback);
    expect(screen.getByText("Henter mappen …")).toBeInTheDocument();
  });

  it("setter mappenavnet som fanetittel, og standardtittel for ukjent mappe", async () => {
    createFolder(TEST_USER_ID, "Hverdag", state.db!);
    expect((await generateMetadata({ params: Promise.resolve({ id: "1" }) })).title).toBe(
      "Hverdag",
    );
    expect((await generateMetadata({ params: Promise.resolve({ id: "999" }) })).title).toBe(
      "Mappe",
    );
    expect((await generateMetadata({ params: Promise.resolve({ id: "abc" }) })).title).toBe(
      "Mappe",
    );
  });

  it("404-siden for mapper lenker til alle mapper", () => {
    render(<FolderNotFound />);
    expect(screen.getByRole("heading", { level: 1, name: "Fant ikke mappen" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Se alle mapper" })).toHaveAttribute("href", "/mapper");
  });
});

describe("uten innlogging og andres mapper (Story 5.13)", () => {
  it("uten innlogging: «Logg inn for å se dette»", async () => {
    session.userId = null;
    try {
      render(await renderPage("1"));
      expect(screen.getByRole("link", { name: "Logg inn" })).toHaveAttribute(
        "href",
        "/logg-inn?neste=%2Fmapper%2F1",
      );
    } finally {
      session.userId = 1;
    }
  });

  it("en annens mappe gir ikke funnet", async () => {
    createFolder(TEST_USER_ID, "Hverdag", state.db!);
    const other = Number(
      state
        .db!.$client.prepare(
          "insert into users (email, password_hash, created_at) values ('b@b.no', 'x', 'x')",
        )
        .run().lastInsertRowid,
    );
    session.userId = other;
    try {
      await expect(renderPage("1")).rejects.toBeInstanceOf(NotFoundError);
    } finally {
      session.userId = 1;
    }
  });
});
