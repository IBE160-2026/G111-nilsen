// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, type Db, TEST_USER_ID } from "@/server/db/client";
import { createManualRecipe, setFavorite } from "@/server/services/recipe-service";

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

const { default: DinnerPage } = await import("./page");

afterEach(cleanup);
beforeEach(() => {
  state.db = createTestDb();
  state.calls = [];
  session.userId = 1;
});

type AsyncComponent = (props: unknown) => Promise<ReactElement>;

async function renderPage() {
  const page = DinnerPage() as ReactElement<{ children: ReactElement[] }>;
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

function recipe(title: string): number {
  const created = createManualRecipe(
    TEST_USER_ID,
    { title, servings: 2, ingredients: ["1 egg"], steps: [] },
    state.db!,
  );
  if (!created.ok) throw new Error("kunne ikke lagre");
  return created.value.id;
}

describe("/middagsforslag", () => {
  it("har overskriften utenfor Suspense og en reservetekst, og leser først etter connection()", async () => {
    const { heading, fallback } = await renderPage();
    render(heading);
    expect(
      screen.getByRole("heading", { level: 1, name: "Hva skal vi ha til middag?" }),
    ).toBeInTheDocument();
    render(fallback);
    expect(screen.getByText("Henter oppskriftene …")).toBeInTheDocument();
    expect(state.calls).toEqual(["connection"]);
  });

  it("uten lagrede oppskrifter vises den vanlige tom-tilstanden", async () => {
    await show();
    expect(
      screen.getByRole("heading", { level: 2, name: "Du har ingen lagrede oppskrifter ennå." }),
    ).toBeInTheDocument();
  });

  it("foreslår en av dine oppskrifter, og favorittfilteret virker", async () => {
    recipe("Suppe");
    const id = recipe("Lasagne");
    setFavorite(id, true, state.db!);
    await show();
    expect(screen.getByText("2 oppskrifter å velge blant")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Bare favoritter"));
    fireEvent.click(screen.getByRole("button", { name: "Foreslå en middag" }));
    expect(screen.getByRole("heading", { level: 2, name: "Lasagne" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Åpne oppskriften" })).toHaveAttribute(
      "href",
      `/oppskrift/${id}`,
    );
  });

  it("en annen brukers oppskrifter brukes ikke", async () => {
    recipe("Suppe");
    session.userId = 99;
    await show();
    expect(screen.queryByRole("button", { name: "Foreslå en middag" })).not.toBeInTheDocument();
  });

  it("viser innloggingskravet uten innlogging", async () => {
    session.userId = null;
    await show();
    expect(screen.getByRole("link", { name: /logg inn/i })).toBeInTheDocument();
  });
});
