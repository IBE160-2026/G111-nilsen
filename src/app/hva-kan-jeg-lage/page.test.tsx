// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, type Db, TEST_USER_ID } from "@/server/db/client";
import { addPantryItem } from "@/server/services/pantry-service";
import { createManualRecipe } from "@/server/services/recipe-service";

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
vi.mock("@/app/handleliste/actions", () => ({ addToPantry: vi.fn(), removeFromPantry: vi.fn() }));

const { default: WhatToCookPage } = await import("./page");

afterEach(cleanup);
beforeEach(() => {
  state.db = createTestDb();
  state.calls = [];
  session.userId = 1;
});

type AsyncComponent = (props: unknown) => Promise<ReactElement>;

async function renderPage() {
  const page = WhatToCookPage() as ReactElement<{ children: ReactElement[] }>;
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

function recipe(title: string, ingredients: string[]) {
  const created = createManualRecipe(
    TEST_USER_ID,
    { title, servings: 2, ingredients, steps: [] },
    state.db!,
  );
  if (!created.ok) throw new Error("kunne ikke lagre");
}

describe("/hva-kan-jeg-lage", () => {
  it("har overskriften utenfor Suspense og en reservetekst, og leser først etter connection()", async () => {
    const { heading, fallback } = await renderPage();
    render(heading);
    expect(
      screen.getByRole("heading", { level: 1, name: "Hva kan jeg lage?" }),
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

  it("matcher det du har hjemme (samme liste som på handlelisten) mot oppskriftene dine", async () => {
    recipe("Eggerøre", ["4 egg", "1 ss smør"]);
    recipe("Fiskegrateng", ["500 g torsk"]);
    addPantryItem(TEST_USER_ID, "Egg", state.db!);
    addPantryItem(TEST_USER_ID, "smør", state.db!);
    await show();
    expect(screen.getByText(/Skriv hva du har hjemme/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fjern Egg" })).toBeInTheDocument();
    const ready = screen.getByRole("region", { name: "Kan lages nå" });
    expect(ready).toHaveTextContent("Eggerøre");
    expect(screen.queryByText("Fiskegrateng")).not.toBeInTheDocument();
  });

  it("en annen brukers hjemme-liste og oppskrifter brukes ikke", async () => {
    recipe("Eggerøre", ["4 egg"]);
    addPantryItem(TEST_USER_ID, "egg", state.db!);
    session.userId = 99;
    await show();
    expect(screen.queryByText("Eggerøre")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Fjern egg" })).not.toBeInTheDocument();
  });

  it("viser innloggingskravet uten innlogging", async () => {
    session.userId = null;
    await show();
    expect(screen.getByRole("link", { name: /logg inn/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Legg til noe du har hjemme")).not.toBeInTheDocument();
  });
});
