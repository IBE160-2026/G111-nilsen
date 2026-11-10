// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, type Db } from "@/server/db/client";
import { insertRecipe, type NewRecipe } from "@/server/db/repositories/recipe-repository";

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

const { default: HandlelistePage } = await import("./page");

afterEach(cleanup);
beforeEach(() => {
  state.db = createTestDb();
  state.calls = [];
});

type AsyncComponent = (props: unknown) => Promise<ReactElement>;

async function renderPage() {
  const page = HandlelistePage() as ReactElement<{ children: ReactElement[] }>;
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

const recipe = (title: string, savedAt: string | null): NewRecipe => ({
  title,
  sourceUrl: null,
  sourceName: null,
  originalServings: 4,
  selectedServings: null,
  savedAt,
  createdAt: "2026-11-09T10:00:00.000Z",
  updatedAt: "2026-11-09T10:00:00.000Z",
  ingredients: [
    {
      position: 1,
      section: null,
      original: "4 dl melk",
      quantity: { min: 4 },
      unit: "dl",
      name: "melk",
      parseable: true,
    },
  ],
  steps: [],
});

describe("/handleliste", () => {
  it("har overskriften utenfor Suspense og en reservetekst", async () => {
    const { heading, fallback } = await renderPage();
    render(heading);
    expect(screen.getByRole("heading", { level: 1, name: "Handleliste" })).toBeInTheDocument();
    render(fallback);
    expect(screen.getByText("Henter oppskriftene …")).toBeInTheDocument();
  });

  it("kaller connection() før databasen leses", async () => {
    await renderPage();
    expect(state.calls).toEqual(["connection"]);
  });

  it("viser tom-tilstand uten lagrede oppskrifter, med lenke til Oppskrifter", async () => {
    insertRecipe(state.db!, recipe("Ulagret", null));
    const { content } = await renderPage();
    render(content);
    expect(screen.getByText("Du har ingen lagrede oppskrifter ennå.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Se oppskrifter" })).toHaveAttribute(
      "href",
      "/oppskrifter",
    );
  });

  it("viser de lagrede oppskriftene som valg, bare de lagrede", async () => {
    insertRecipe(state.db!, recipe("Pannekaker", "2026-11-09T10:00:00.000Z"));
    insertRecipe(state.db!, recipe("Ulagret", null));
    const { content } = await renderPage();
    render(content);
    expect(screen.getByRole("checkbox", { name: "Pannekaker" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Ulagret" })).not.toBeInTheDocument();
  });
});
