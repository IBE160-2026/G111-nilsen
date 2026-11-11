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
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { default: UkemenyPage } = await import("./page");

afterEach(cleanup);
beforeEach(() => {
  state.db = createTestDb();
  state.calls = [];
  session.userId = TEST_USER_ID;
});

type AsyncComponent = (props: unknown) => Promise<ReactElement>;

async function renderPage(uke?: string) {
  const page = UkemenyPage({ searchParams: Promise.resolve({ uke }) }) as ReactElement<{
    children: ReactElement[];
  }>;
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
const recipe = (title: string, savedAt: string | null = T0): NewRecipe => ({
  title,
  sourceUrl: null,
  sourceName: null,
  originalServings: 4,
  selectedServings: null,
  savedAt,
  createdAt: T0,
  updatedAt: T0,
  ingredients: [],
  steps: [],
  userId: TEST_USER_ID,
});

describe("/ukemeny", () => {
  it("har overskriften utenfor Suspense, en reservetekst og kaller connection()", async () => {
    const { heading, fallback } = await renderPage();
    render(heading);
    expect(screen.getByRole("heading", { level: 1, name: "Ukemeny" })).toBeInTheDocument();
    render(fallback);
    expect(screen.getByText("Henter ukemenyen …")).toBeInTheDocument();
    expect(state.calls).toEqual(["connection"]);
  });

  it("viser uka som ?uke= peker på, med forrige/neste uke og «Denne uka»", async () => {
    insertRecipe(state.db!, recipe("Pannekaker"));
    render((await renderPage("2026-11-12")).content);
    expect(screen.getByText("Uke 46 · 9.–15. november 2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← Forrige uke" })).toHaveAttribute(
      "href",
      "/ukemeny?uke=2026-11-02",
    );
    expect(screen.getByRole("link", { name: "Neste uke →" })).toHaveAttribute(
      "href",
      "/ukemeny?uke=2026-11-16",
    );
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(7);
    expect(screen.getByRole("link", { name: "Lag handleliste for uka" })).toHaveAttribute(
      "href",
      "/handleliste?uke=2026-11-09",
    );
  });

  it("viser oppføringene på riktig dag og bare lagrede oppskrifter i valget", async () => {
    const id = insertRecipe(state.db!, recipe("Pannekaker"));
    insertRecipe(state.db!, recipe("Ulagret", null));
    addToWeek(TEST_USER_ID, id, "2026-11-11", 3, state.db!);
    render((await renderPage("2026-11-09")).content);
    const wednesday = screen
      .getByRole("heading", { level: 2, name: /onsdag 11\. november/ })
      .closest("li")!;
    expect(within(wednesday).getByRole("link", { name: "Pannekaker" })).toBeInTheDocument();
    expect(wednesday).toHaveTextContent("3 porsj.");
    const options = within(
      screen.getByRole("form", { name: "Legg til på mandag 9. november" }),
    ).getAllByRole("option", { hidden: true });
    expect(options.map((o) => o.textContent)).toEqual(["Pannekaker"]);
  });

  it("lister planlagte uker i «Dine uker», og markerer uka som vises", async () => {
    const id = insertRecipe(state.db!, recipe("Pannekaker"));
    addToWeek(TEST_USER_ID, id, "2026-11-11", 3, state.db!);
    addToWeek(TEST_USER_ID, id, "2026-11-12", 3, state.db!);
    addToWeek(TEST_USER_ID, id, "2026-10-28", 2, state.db!);
    render((await renderPage("2026-11-09")).content);
    const section = screen
      .getByRole("heading", { level: 2, name: "Dine uker" })
      .closest("section")!;
    const links = within(section).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/ukemeny?uke=2026-11-09",
      "/ukemeny?uke=2026-10-26",
    ]);
    expect(links[0]).toHaveTextContent("2 retter · Vises nå");
    expect(links[0]).toHaveAttribute("aria-current", "page");
    expect(links[1]).toHaveTextContent("1 rett");
    expect(links[1]).not.toHaveAttribute("aria-current");
  });

  it("viser ikke «Dine uker» uten planlagte uker", async () => {
    insertRecipe(state.db!, recipe("Pannekaker"));
    render((await renderPage("2026-11-09")).content);
    expect(screen.queryByRole("heading", { name: "Dine uker" })).not.toBeInTheDocument();
  });

  it("viser tom-tilstand uten lagrede oppskrifter", async () => {
    render((await renderPage("2026-11-09")).content);
    expect(screen.getByText("Du har ingen lagrede oppskrifter ennå.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Se oppskrifter" })).toHaveAttribute(
      "href",
      "/oppskrifter",
    );
  });

  it("ber om innlogging og sender tilbake til samme uke", async () => {
    session.userId = null;
    render((await renderPage("2026-11-12")).content);
    expect(screen.getByRole("heading", { name: "Logg inn for å se dette" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Logg inn" })).toHaveAttribute(
      "href",
      "/logg-inn?neste=%2Fukemeny%3Fuke%3D2026-11-09",
    );
  });
});
