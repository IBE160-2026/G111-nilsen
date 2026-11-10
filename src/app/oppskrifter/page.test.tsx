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

const state = vi.hoisted(() => ({
  db: null as Db | null,
  forcedErrorKind: null as string | null,
  calls: [] as string[],
}));

vi.mock("@/server/db/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/db/client")>();
  return { ...actual, getDb: () => state.db! };
});

vi.mock("@/server/services/recipe-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/services/recipe-service")>();
  return {
    ...actual,
    listCollection: (...args: Parameters<typeof actual.listCollection>) => {
      state.calls.push("listCollection");
      return state.forcedErrorKind
        ? { ok: false, error: { kind: state.forcedErrorKind } }
        : actual.listCollection(...args);
    },
  };
});

vi.mock("@/app/oppskrift/[id]/actions", () => ({ setFavorite: vi.fn() }));

vi.mock("next/server", () => ({
  connection: () => {
    state.calls.push("connection");
    return Promise.resolve();
  },
}));

const { default: SamlingenPage } = await import("./page");

afterEach(cleanup);
beforeEach(() => {
  state.db = createTestDb();
  state.forcedErrorKind = null;
  state.calls = [];
});

const recipe = (title: string, savedAt: string | null, extra: Partial<NewRecipe> = {}) => ({
  title,
  sourceUrl: null,
  sourceName: null,
  originalServings: 4,
  selectedServings: null,
  savedAt,
  createdAt: "2026-11-09T10:00:00.000Z",
  updatedAt: "2026-11-09T10:00:00.000Z",
  userId: TEST_USER_ID,
  ingredients: [],
  steps: [],
  ...extra,
});

type AsyncComponent = (props: unknown) => Promise<ReactElement>;

/** Overskriften utenfor Suspense, og den asynkrone delen inne i grensen. */
async function renderPage() {
  const page = SamlingenPage() as ReactElement<{ children: ReactElement[] }>;
  const [heading, suspense] = page.props.children as [
    ReactElement,
    ReactElement<{ children: ReactElement; fallback: ReactElement }>,
  ];
  const loader = suspense.props.children;
  return {
    heading,
    fallback: suspense.props.fallback,
    content: await (loader.type as AsyncComponent)(loader.props),
  };
}

async function show() {
  const { heading, content } = await renderPage();
  render(
    <>
      {heading}
      {content}
    </>,
  );
}

describe("/oppskrifter", () => {
  it("har en lenke til ukemenyen ved overskriften (Story 6.4)", async () => {
    render((await renderPage()).heading);
    expect(screen.getByRole("link", { name: "Ukemeny" })).toHaveAttribute("href", "/ukemeny");
  });

  it("har en lenke til handlelisten ved overskriften", async () => {
    render((await renderPage()).heading);
    expect(screen.getByRole("link", { name: "Lag handleliste" })).toHaveAttribute(
      "href",
      "/handleliste",
    );
  });

  it("har overskriften utenfor Suspense og en reservetekst", async () => {
    const { heading, fallback } = await renderPage();
    render(heading);
    expect(screen.getByRole("heading", { level: 1, name: "Oppskrifter" })).toBeInTheDocument();
    render(fallback);
    expect(screen.getByText("Henter oppskriftene …")).toBeInTheDocument();
  });

  it("kaller connection() før databasen leses (ikke ved bygging)", async () => {
    await renderPage();
    expect(state.calls).toEqual(["connection", "listCollection"]);
  });

  it("viser tom-tilstand med «Legg inn selv» og «Importer din første oppskrift»", async () => {
    await show();
    expect(
      screen.getByRole("heading", { level: 2, name: "Du har ingen lagrede oppskrifter ennå." }),
    ).toBeInTheDocument();
    const links = screen
      .getAllByRole("link")
      .filter((a) => !["/handleliste", "/ukemeny"].includes(a.getAttribute("href") ?? ""));
    expect(links.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["Legg inn selv", "/ny"],
      ["Importer din første oppskrift", "/"],
    ]);
  });

  it("viser oppskrifter som kort, sist lagret først, med riktig kilde", async () => {
    insertRecipe(state.db!, recipe("Eldst", "2026-11-09T09:00:00.000Z"));
    const middle = insertRecipe(
      state.db!,
      recipe("Midten", "2026-11-09T10:00:00.000Z", { sourceName: "Matprat" }),
    );
    insertRecipe(
      state.db!,
      recipe("Nyest", "2026-11-09T11:00:00.000Z", { sourceUrl: "https://www.example.com/x" }),
    );
    await show();

    const list = screen.getByRole("list");
    // Eksplisitt rolle, siden `list-style: none` fjerner listesemantikken i Safari.
    expect(list).toHaveAttribute("role", "list");
    const items = within(list).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      "Nyestexample.com",
      "MidtenMatprat",
      "EldstLagt inn selv",
    ]);
    expect(within(items[1]).getByRole("link")).toHaveAttribute("href", `/oppskrift/${middle}`);
    expect(
      screen.queryByRole("heading", { name: "Du har ingen lagrede oppskrifter ennå." }),
    ).not.toBeInTheDocument();
  });

  it("viser mappenavnet på kortet: «Matprat · Hverdag», og bare kilden uten mappe", async () => {
    createFolder(TEST_USER_ID, "Hverdag", state.db!);
    const inFolder = insertRecipe(
      state.db!,
      recipe("I mappe", "2026-11-09T11:00:00.000Z", { sourceName: "Matprat" }),
    );
    insertRecipe(
      state.db!,
      recipe("Uten mappe", "2026-11-09T10:00:00.000Z", { sourceName: "Matprat" }),
    );
    moveRecipeToFolder(TEST_USER_ID, inFolder, 1, state.db!);
    await show();
    const links = screen
      .getAllByRole("link")
      .filter((a) => !["/handleliste", "/ukemeny"].includes(a.getAttribute("href") ?? ""));
    expect(links.map((a) => a.textContent)).toEqual([
      "I mappeMatprat · Hverdag",
      "Uten mappeMatprat",
    ]);
  });

  it("hvert kort har et hjerte som søsken til lenken: fylt for favoritter, omriss for andre (Story 3.4)", async () => {
    const fav = insertRecipe(state.db!, recipe("Favoritten", "2026-11-09T11:00:00.000Z"));
    insertRecipe(state.db!, recipe("Vanlig", "2026-11-09T10:00:00.000Z"));
    setFavorite(fav, true, state.db!);
    await show();
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByRole("button", { name: "Favoritt: Favoritten" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(items[1]).getByRole("button", { name: "Favoritt: Vanlig" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    for (const item of items) {
      expect(within(item).getByRole("link")).not.toContainElement(within(item).getByRole("button"));
    }
  });

  it("utelater oppskrifter som ikke er i samlingen", async () => {
    insertRecipe(state.db!, recipe("Importert", null, { sourceUrl: "https://a.no/x" }));
    insertRecipe(state.db!, recipe("I samlingen", "2026-11-09T10:00:00.000Z"));
    await show();
    expect(screen.queryByText("Importert")).not.toBeInTheDocument();
    expect(screen.getByText("I samlingen")).toBeInTheDocument();
  });

  it("kaster en feil til error.tsx når lesingen feiler, i stedet for å vise tom samling", async () => {
    state.forcedErrorKind = "unknown";
    await expect(renderPage()).rejects.toThrow(/Kunne ikke hente oppskriftene \(unknown\)/);
  });
});

describe("/oppskrifter uten innlogging (Story 5.13)", () => {
  it("viser «Logg inn for å se dette» med lenker som sender brukeren tilbake", async () => {
    session.userId = null;
    try {
      await show();
      expect(screen.getByRole("heading", { name: "Logg inn for å se dette" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Logg inn" })).toHaveAttribute(
        "href",
        "/logg-inn?neste=%2Foppskrifter",
      );
      expect(screen.getByRole("link", { name: "Lag konto" })).toHaveAttribute(
        "href",
        "/ny-konto?neste=%2Foppskrifter",
      );
      expect(state.calls).not.toContain("listCollection");
    } finally {
      session.userId = TEST_USER_ID;
    }
  });
});
