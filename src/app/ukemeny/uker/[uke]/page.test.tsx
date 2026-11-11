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
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const { default: WeekSummaryPage } = await import("./page");

afterEach(cleanup);
beforeEach(() => {
  state.db = createTestDb();
  state.calls = [];
  session.userId = TEST_USER_ID;
});

type AsyncComponent = (props: unknown) => Promise<ReactElement>;

async function renderPage(uke: string) {
  const page = WeekSummaryPage({ params: Promise.resolve({ uke }) }) as ReactElement<{
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
    content: () => (loader.type as AsyncComponent)(loader.props),
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

describe("/ukemeny/uker/[uke]", () => {
  it("har overskriften utenfor Suspense og kaller connection()", async () => {
    const { heading, fallback, content } = await renderPage("2026-11-09");
    render(heading);
    expect(screen.getByRole("heading", { level: 1, name: "Ukemeny" })).toBeInTheDocument();
    render(fallback);
    expect(screen.getByText("Henter ukemenyen …")).toBeInTheDocument();
    await content();
    expect(state.calls).toEqual(["connection"]);
  });

  it("viser dagene med rettene og veien videre til handlelisten og til å endre uka", async () => {
    const pannekaker = insertRecipe(state.db!, recipe("Pannekaker"));
    const taco = insertRecipe(state.db!, recipe("Taco"));
    addToWeek(TEST_USER_ID, pannekaker, "2026-11-11", 3, state.db!);
    addToWeek(TEST_USER_ID, taco, "2026-11-13", 2.5, state.db!);
    render(await (await renderPage("2026-11-09")).content());
    expect(screen.getByText("Uke 46 · 9.–15. november 2026")).toBeInTheDocument();
    const days = screen.getAllByRole("heading", { level: 2 });
    expect(days).toHaveLength(2);
    const first = days[0]!.closest("li")!;
    expect(within(first).getByRole("link", { name: "Pannekaker" })).toHaveAttribute(
      "href",
      `/oppskrift/${pannekaker}`,
    );
    expect(first).toHaveTextContent("3 porsj.");
    expect(screen.getByRole("link", { name: "Se handlelisten for uka" })).toHaveAttribute(
      "href",
      "/handleliste?uke=2026-11-09",
    );
    expect(screen.getByRole("link", { name: "Endre uka" })).toHaveAttribute(
      "href",
      "/ukemeny?uke=2026-11-09",
    );
    expect(screen.getByRole("link", { name: "← Alle uker" })).toHaveAttribute(
      "href",
      "/ukemeny/uker",
    );
  });

  it("viser en tom-tilstand med «Planlegg uka» for en uke uten retter", async () => {
    render(await (await renderPage("2026-11-09")).content());
    expect(screen.getByText("Ingenting er planlagt denne uka.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Planlegg uka" })).toHaveAttribute(
      "href",
      "/ukemeny?uke=2026-11-09",
    );
    expect(screen.queryByRole("link", { name: "Se handlelisten for uka" })).not.toBeInTheDocument();
  });

  it("gir 404 for en ugyldig dato eller en dag som ikke er mandag", async () => {
    for (const uke of ["nope", "2026-02-30", "2026-11-10"])
      await expect((await renderPage(uke)).content()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("ber om innlogging og sender tilbake hit", async () => {
    session.userId = null;
    render(await (await renderPage("2026-11-09")).content());
    expect(screen.getByRole("link", { name: "Logg inn" })).toHaveAttribute(
      "href",
      "/logg-inn?neste=%2Fukemeny%2Fuker%2F2026-11-09",
    );
  });
});
