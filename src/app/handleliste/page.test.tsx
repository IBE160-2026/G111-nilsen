// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, type Db, TEST_USER_ID } from "@/server/db/client";
import { insertRecipe, type NewRecipe } from "@/server/db/repositories/recipe-repository";
import { addToWeek, setCheck } from "@/server/services/meal-plan-service";
import { addPantryItem } from "@/server/services/pantry-service";
import { saveSavedList } from "@/server/services/shopping-list-service";

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

async function renderPage(uke?: string, liste?: string) {
  const page = HandlelistePage({ searchParams: Promise.resolve({ uke, liste }) }) as ReactElement<{
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
  it("velger ukas oppskrifter med antall porsjoner lagt sammen, og ikke de andre", async () => {
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
    expect(screen.getByRole("spinbutton", { name: "Antall porsjoner for Pannekaker" })).toHaveValue(
      5,
    );
    // 4 dl melk for 4 porsjoner → 5 dl for 5.
    expect(screen.getByText("5 dl melk")).toBeInTheDocument();
  });

  it("viser avkrysningene som er lagret for uka (Story 6.4c)", async () => {
    const pancakes = insertRecipe(state.db!, recipe("Pannekaker", "2026-11-09T10:00:00.000Z"));
    addToWeek(TEST_USER_ID, pancakes, "2026-11-09", 4, state.db!);
    render((await renderPage("2026-11-09")).content);
    const melk = screen.getByRole("checkbox", { name: /melk/ });
    expect(melk).not.toBeChecked();
    cleanup();
    setCheck(TEST_USER_ID, "2026-11-09", "melk|dl", true, state.db!);
    render((await renderPage("2026-11-09")).content);
    expect(screen.getByRole("checkbox", { name: /melk/ })).toBeChecked();
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

describe("uke og lagrede lister (Story 6.4g)", () => {
  const savedAt = "2026-11-09T10:00:00.000Z";

  it("er for denne uka som standard, med uke-navigasjon og lenke til ukemenyen", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-11T12:00:00Z"));
    try {
      const pancakes = insertRecipe(state.db!, recipe("Pannekaker", savedAt));
      addToWeek(TEST_USER_ID, pancakes, "2026-11-10", 6, state.db!);
      render((await renderPage()).content);
      expect(screen.getByRole("checkbox", { name: "Pannekaker" })).toBeChecked();
      expect(screen.getByText("Uke 46 · 9.–15. november 2026")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "← Forrige uke" })).toHaveAttribute(
        "href",
        "/handleliste?uke=2026-11-02",
      );
      expect(screen.getByRole("link", { name: "Neste uke →" })).toHaveAttribute(
        "href",
        "/handleliste?uke=2026-11-16",
      );
      expect(screen.getByRole("link", { name: "Ukemeny" })).toHaveAttribute(
        "href",
        "/ukemeny?uke=2026-11-09",
      );
      expect(screen.getByRole("textbox", { name: "Navn på listen" })).toHaveValue("Uke 46");
    } finally {
      vi.useRealTimers();
    }
  });

  it("sier fra og lenker til «Planlegg uka» når uka ikke har noen retter", async () => {
    insertRecipe(state.db!, recipe("Pannekaker", savedAt));
    render((await renderPage("2026-11-09")).content);
    expect(
      screen.getByText(/Ingen retter er lagt i ukemenyen for denne uka\./),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Planlegg uka" })).toHaveAttribute(
      "href",
      "/ukemeny?uke=2026-11-09",
    );
  });

  it("åpner en lagret liste med valgte oppskrifter og porsjoner, uten ukenavigasjon", async () => {
    const pancakes = insertRecipe(state.db!, recipe("Pannekaker", savedAt));
    insertRecipe(state.db!, recipe("Vafler", savedAt));
    const saved = saveSavedList(
      TEST_USER_ID,
      "Fredagstaco",
      [{ recipeId: pancakes, servings: 8 }],
      state.db!,
    );
    const id = saved.ok ? saved.value.id : 0;
    render((await renderPage(undefined, String(id))).content);
    expect(screen.getByText(/Lagret liste: Fredagstaco\./)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Pannekaker" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Vafler" })).not.toBeChecked();
    expect(screen.getByLabelText("Antall porsjoner for Pannekaker")).toHaveValue(8);
    expect(screen.getByRole("textbox", { name: "Navn på listen" })).toHaveValue("Fredagstaco");
    expect(screen.queryByRole("link", { name: /Forrige uke/ })).not.toBeInTheDocument();
  });

  it("viser lagrede lister nederst, med lenke til hver", async () => {
    const pancakes = insertRecipe(state.db!, recipe("Pannekaker", savedAt));
    saveSavedList(TEST_USER_ID, "Uke 45", [{ recipeId: pancakes, servings: 4 }], state.db!);
    render((await renderPage("2026-11-09")).content);
    const section = screen
      .getByRole("heading", { name: "Lagrede handlelister" })
      .closest("section")!;
    expect(within(section).getByRole("link", { name: "Åpne Uke 45" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/handleliste\?liste=\d+$/),
    );
  });

  it("sier fra om en ukjent liste, og viser uka i stedet", async () => {
    insertRecipe(state.db!, recipe("Pannekaker", savedAt));
    for (const liste of ["999", "abc"]) {
      render((await renderPage("2026-11-09", liste)).content);
      if (liste === "999")
        expect(screen.getByRole("alert")).toHaveTextContent("Fant ikke den lagrede handlelisten.");
      expect(screen.getByRole("checkbox", { name: "Pannekaker" })).toBeInTheDocument();
      cleanup();
    }
  });

  it("sender tilbake til listen etter innlogging", async () => {
    session.userId = null;
    try {
      render((await renderPage(undefined, "4")).content);
      expect(screen.getByRole("link", { name: "Logg inn" })).toHaveAttribute(
        "href",
        "/logg-inn?neste=%2Fhandleliste%3Fliste%3D4",
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
