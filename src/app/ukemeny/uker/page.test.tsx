// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, type Db, TEST_USER_ID } from "@/server/db/client";
import { insertRecipe, type NewRecipe } from "@/server/db/repositories/recipe-repository";
import { addToWeek } from "@/server/services/meal-plan-service";

const session = vi.hoisted(() => ({ userId: 1 as number | null }));
vi.mock("@/server/session", () => ({
  currentUserId: async () => session.userId,
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

const { default: AllWeeksPage } = await import("./page");

afterEach(cleanup);
beforeEach(() => {
  state.db = createTestDb();
  state.calls = [];
  session.userId = TEST_USER_ID;
});

type AsyncComponent = (props: unknown) => Promise<ReactElement>;

async function renderPage() {
  const page = AllWeeksPage() as ReactElement<{ children: ReactElement[] }>;
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

const T0 = "2026-11-09T10:00:00.000Z";
const recipe = (title: string): NewRecipe => ({
  title,
  sourceUrl: null,
  sourceName: null,
  originalServings: 4,
  selectedServings: null,
  savedAt: T0,
  createdAt: T0,
  updatedAt: T0,
  ingredients: [],
  steps: [],
  userId: TEST_USER_ID,
});

describe("/ukemeny/uker", () => {
  it("har overskriften utenfor Suspense og kaller connection()", async () => {
    const { heading, fallback } = await renderPage();
    render(heading);
    expect(screen.getByRole("heading", { level: 1, name: "Alle uker" })).toBeInTheDocument();
    render(fallback);
    expect(screen.getByText("Henter ukemenyen …")).toBeInTheDocument();
    expect(state.calls).toEqual(["connection"]);
  });

  it("lister hver planlagte uke med rettene, og lenke til ukas egen side", async () => {
    const id = insertRecipe(state.db!, recipe("Pannekaker"));
    const taco = insertRecipe(state.db!, recipe("Taco"));
    addToWeek(TEST_USER_ID, id, "2026-11-11", 3, state.db!);
    addToWeek(TEST_USER_ID, taco, "2026-11-12", 3, state.db!);
    addToWeek(TEST_USER_ID, id, "2026-09-16", 2, state.db!);
    render((await renderPage()).content);
    const list = screen.getByRole("list");
    const weekLinks = within(list).getAllByRole("link");
    expect(weekLinks.map((link) => link.getAttribute("href"))).toEqual([
      "/ukemeny/uker/2026-11-09",
      "/ukemeny/uker/2026-09-14",
    ]);
    expect(weekLinks[0]).toHaveTextContent("Uke 46 · 9.–15. november 2026");
    expect(weekLinks[0]).toHaveTextContent("2 retter");
    expect(weekLinks[1]).toHaveTextContent("Uke 38 · 14.–20. september 2026");
    expect(within(list).getByText("Pannekaker, Taco")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← Ukemeny" })).toHaveAttribute("href", "/ukemeny");
  });

  it("viser en tom-tilstand uten planlagte uker", async () => {
    render((await renderPage()).content);
    expect(screen.getByText("Du har ikke planlagt noen uker ennå.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Planlegg en uke" })).toHaveAttribute(
      "href",
      "/ukemeny",
    );
  });

  it("ber om innlogging og sender tilbake hit", async () => {
    session.userId = null;
    render((await renderPage()).content);
    expect(screen.getByRole("link", { name: "Logg inn" })).toHaveAttribute(
      "href",
      "/logg-inn?neste=%2Fukemeny%2Fuker",
    );
  });
});
