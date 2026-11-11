// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, type Db, TEST_USER_ID } from "@/server/db/client";
import { createManualRecipe, deleteRecipe } from "@/server/services/recipe-service";

const session = vi.hoisted(() => ({ userId: 1 as number | null }));
vi.mock("@/server/session", () => ({
  currentUserId: async () => session.userId,
  currentUser: async () =>
    session.userId === null ? null : { id: session.userId, email: "test@example.com" },
}));

const state = vi.hoisted(() => ({ db: null as Db | null, calls: [] as string[] }));
vi.mock("@/server/db/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/db/client")>();
  return { ...actual, getDb: () => state.db! };
});
vi.mock("next/server", () => ({
  connection: () => {
    state.calls.push("connection");
    return Promise.resolve();
  },
}));
vi.mock("./actions", () => ({ restoreDeleted: vi.fn(), deleteDeletedForGood: vi.fn() }));

const { default: NyligSlettetPage } = await import("./page");

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
  };
});
afterEach(cleanup);
beforeEach(() => {
  state.db = createTestDb();
  state.calls = [];
  session.userId = 1;
});

type AsyncComponent = (props: unknown) => Promise<ReactElement>;

async function renderPage() {
  const page = NyligSlettetPage() as ReactElement<{ children: ReactElement[] }>;
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

function deleteOne(title: string) {
  const created = createManualRecipe(
    TEST_USER_ID,
    { title, servings: 2, ingredients: ["2 egg"], steps: [] },
    state.db!,
  );
  if (!created.ok) throw new Error("kunne ikke lagre");
  if (!deleteRecipe(created.value.id, state.db!).ok) throw new Error("kunne ikke slette");
}

describe("/nylig-slettet", () => {
  it("har overskriften utenfor Suspense og en reservetekst, og leser først etter connection()", async () => {
    const { heading, fallback } = await renderPage();
    render(heading);
    expect(screen.getByRole("heading", { level: 1, name: "Nylig slettet" })).toBeInTheDocument();
    render(fallback);
    expect(screen.getByText("Henter slettede oppskrifter …")).toBeInTheDocument();
    expect(state.calls).toEqual(["connection"]);
  });

  it("viser en tom-tilstand med lenke til Oppskrifter når ingenting er slettet", async () => {
    await show();
    expect(
      screen.getByRole("heading", { level: 2, name: "Ingen slettede oppskrifter." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Se oppskrifter" })).toHaveAttribute(
      "href",
      "/oppskrifter",
    );
  });

  it("lister slettede oppskrifter, nyeste først, med dato og dager igjen", async () => {
    deleteOne("Første");
    deleteOne("Andre");
    await show();
    expect(
      screen.getByText(/^Oppskrifter?|Slettede oppskrifter ligger her i 7 dager/),
    ).toBeInTheDocument();
    const titles = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(titles).toEqual(["Andre", "Første"]);
    expect(screen.getAllByText(/^Slettet \d+\. \w+ · Borte for godt om 6 dager$/)).toHaveLength(2);
  });

  it("viser innloggingskravet uten innlogging", async () => {
    session.userId = null;
    await show();
    expect(screen.queryByText("Ingen slettede oppskrifter.")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /logg inn/i })).toBeInTheDocument();
  });
});
