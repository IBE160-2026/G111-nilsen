// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, type Db, TEST_USER_ID } from "@/server/db/client";
import { insertRecipe, type NewRecipe } from "@/server/db/repositories/recipe-repository";
import { addToWeek } from "@/server/services/meal-plan-service";
import { addPantryItem } from "@/server/services/pantry-service";

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

const { default: HandlelistePage } = await import("./page");

afterEach(cleanup);
beforeEach(() => {
  state.db = createTestDb();
  state.calls = [];
});

type AsyncComponent = (props: unknown) => Promise<ReactElement>;

async function renderPage(uke?: string) {
  const page = HandlelistePage({ searchParams: Promise.resolve({ uke }) }) as ReactElement<{
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

const recipe = (title: string, savedAt: string | null): NewRecipe => ({
  title,
  sourceUrl: null,
  sourceName: null,
  originalServings: 4,
  selectedServings: null,
  savedAt,
  createdAt: "2026-11-09T10:00:00.000Z",
  updatedAt: "2026-11-09T10:00:00.000Z",
  userId: TEST_USER_ID,
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

  it("viser det som er lagret som «Har hjemme», og skjuler det fra listen", async () => {
    insertRecipe(state.db!, recipe("Pannekaker", "2026-11-09T10:00:00.000Z"));
    addPantryItem(TEST_USER_ID, "Melk", state.db!);
    addPantryItem(TEST_USER_ID, "Salt", state.db!);
    const { content } = await renderPage();
    render(content);
    const section = screen
      .getByRole("heading", { level: 2, name: "Har hjemme" })
      .closest("section")!;
    expect(section).toHaveTextContent("Melk");
    expect(section).toHaveTextContent("Salt");
  });
});

describe("fra ukemenyen, ?uke= (Story 6.4)", () => {
  it("velger ukas oppskrifter med antall personer lagt sammen, og ikke de andre", async () => {
    const pancakes = insertRecipe(state.db!, recipe("Pannekaker", "2026-11-09T10:00:00.000Z"));
    insertRecipe(state.db!, recipe("Vafler", "2026-11-09T10:00:00.000Z"));
    const outside = insertRecipe(state.db!, recipe("Taco", "2026-11-09T10:00:00.000Z"));
    addToWeek(TEST_USER_ID, pancakes, "2026-11-09", 2, state.db!);
    addToWeek(TEST_USER_ID, pancakes, "2026-11-12", 3, state.db!);
    addToWeek(TEST_USER_ID, outside, "2026-11-16", 4, state.db!);
    render((await renderPage("2026-11-11")).content);
    expect(screen.getByText(/Valgt fra ukemenyen: Uke 46/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ukemeny" })).toHaveAttribute(
      "href",
      "/ukemeny?uke=2026-11-09",
    );
    expect(screen.getByRole("checkbox", { name: "Pannekaker" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Vafler" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Taco" })).not.toBeChecked();
    expect(screen.getByRole("spinbutton", { name: "Antall personer for Pannekaker" })).toHaveValue(
      5,
    );
    // 4 dl melk for 4 personer → 5 dl for 5.
    expect(screen.getByText("5 dl melk")).toBeInTheDocument();
  });

  it("ignorerer en ugyldig uke og velger ingenting", async () => {
    insertRecipe(state.db!, recipe("Pannekaker", "2026-11-09T10:00:00.000Z"));
    render((await renderPage("i-morgen")).content);
    expect(screen.queryByText(/Valgt fra ukemenyen/)).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Pannekaker" })).not.toBeChecked();
  });

  it("sender tilbake til samme uke etter innlogging", async () => {
    session.userId = null;
    try {
      render((await renderPage("2026-11-09")).content);
      expect(screen.getByRole("link", { name: "Logg inn" })).toHaveAttribute(
        "href",
        "/logg-inn?neste=%2Fhandleliste%3Fuke%3D2026-11-09",
      );
    } finally {
      session.userId = 1;
    }
  });
});

describe("uten innlogging (Story 5.13)", () => {
  it("viser «Logg inn for å se dette» i stedet for innholdet", async () => {
    session.userId = null;
    try {
      render((await renderPage()).content);
      expect(screen.getByRole("heading", { name: "Logg inn for å se dette" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Logg inn" })).toHaveAttribute(
        "href",
        "/logg-inn?neste=%2Fhandleliste",
      );
    } finally {
      session.userId = 1;
    }
  });
});
