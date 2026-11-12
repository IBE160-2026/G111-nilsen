// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, TEST_USER_ID, type Db } from "@/server/db/client";
import { addToWeek } from "@/server/services/meal-plan-service";
import {
  addRecipeLabel,
  createManualRecipe,
  markRecipeCooked,
  setFavorite,
  setRecipeRating,
} from "@/server/services/recipe-service";
import { moveRecipeToNewFolder } from "@/server/services/folder-service";

const session = vi.hoisted(() => ({ userId: 1 as number | null }));
vi.mock("@/server/session", () => ({ currentUserId: async () => session.userId }));
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

const { default: StatsPage } = await import("./page");

afterEach(cleanup);
beforeEach(() => {
  session.userId = TEST_USER_ID;
  state.db = createTestDb();
  state.calls = [];
});

type AsyncComponent = (props: unknown) => Promise<ReactElement>;

function parts() {
  const page = StatsPage() as ReactElement<{ children: ReactElement[] }>;
  const [heading, suspense] = page.props.children as [
    ReactElement,
    ReactElement<{ children: ReactElement; fallback: ReactElement }>,
  ];
  return { heading, suspense };
}

async function show() {
  const { heading, suspense } = parts();
  const loader = suspense.props.children;
  render(
    <>
      {heading}
      {await (loader.type as AsyncComponent)(loader.props)}
    </>,
  );
}

function recipe(title: string, minutes?: number): number {
  const created = createManualRecipe(
    TEST_USER_ID,
    { title, servings: 4, minutes, ingredients: ["2 egg"], steps: ["Stek."] },
    state.db!,
  );
  if (!created.ok) throw new Error("kunne ikke lagre");
  return created.value.id;
}

function card(name: string) {
  return screen.getByRole("region", { name });
}

describe("/statistikk", () => {
  it("har overskriften utenfor Suspense og leser først etter connection()", async () => {
    const { heading, suspense } = parts();
    render(heading);
    expect(screen.getByRole("heading", { level: 1, name: "Statistikk" })).toBeInTheDocument();
    render(suspense.props.fallback);
    expect(screen.getByText("Regner ut …")).toBeInTheDocument();
    await show();
    expect(state.calls).toEqual(["connection"]);
  });

  it("uten oppskrifter står det at det ikke er tall ennå", async () => {
    await show();
    expect(screen.getByRole("heading", { level: 2, name: "Ingen tall ennå" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Laget oftest" })).toBeNull();
  });

  it("viser nøkkeltall, hva som er laget oftest og hva som aldri er laget", async () => {
    const taco = recipe("Taco", 30);
    const suppe = recipe("Suppe", 50);
    recipe("Brød");
    markRecipeCooked(taco, state.db!, () => new Date("2026-11-10T17:00:00.000Z"));
    markRecipeCooked(taco, state.db!, () => new Date("2026-11-11T17:00:00.000Z"));
    markRecipeCooked(suppe, state.db!, () => new Date("2026-11-09T17:00:00.000Z"));
    setFavorite(taco, true, state.db!);
    await show();

    const key = screen.getByRole("list", { name: "Kort fortalt" });
    const figures = within(key)
      .getAllByRole("listitem")
      .map((item) => item.textContent);
    // 3 oppskrifter, 3 ganger laget, 1 favoritt, 0 planlagte middager.
    expect(figures).toEqual(["3oppskrifter", "3ganger laget", "1favoritt", "0planlagte middager"]);

    const mest = card("Laget oftest");
    expect(
      within(mest)
        .getAllByRole("link")
        .map((l) => l.textContent),
    ).toEqual(["Taco", "Suppe"]);
    expect(within(mest).getByText("2 ganger")).toBeInTheDocument();
    expect(within(mest).getByText("1 gang")).toBeInTheDocument();
    expect(mest).toHaveTextContent("1 oppskrift har du ikke laget ennå.");

    const sist = card("Sist laget");
    expect(within(sist).getAllByRole("link")[0]).toHaveTextContent("Taco");
    expect(sist).toHaveTextContent("11. november 2026");
  });

  it("viser vurdering, mapper, merkelapper og kilder", async () => {
    const taco = recipe("Taco", 30);
    const suppe = recipe("Suppe", 50);
    setRecipeRating(taco, 5, state.db!);
    setRecipeRating(suppe, 4, state.db!);
    addRecipeLabel(taco, "Rask", state.db!);
    moveRecipeToNewFolder(TEST_USER_ID, taco, "Hverdag", state.db!);
    await show();

    const best = card("Best vurdert");
    expect(
      within(best)
        .getAllByRole("link")
        .map((l) => l.textContent),
    ).toEqual(["Taco", "Suppe"]);
    // Snittene står samlet under nøkkeltallene, ikke inne i kortene.
    expect(screen.getByText(/Snittvurdering 4,5 av 5/)).toHaveTextContent("2 av 2 er vurdert");
    expect(screen.getByText(/Snittid 40 minutter/)).toBeInTheDocument();

    expect(card("Mapper")).toHaveTextContent("Hverdag");
    expect(card("Mapper")).toHaveTextContent("Uten mappe");
    expect(card("Merkelapper")).toHaveTextContent("Rask");
    expect(card("Kilder")).toHaveTextContent("Lagt inn selv");
  });

  it("teller måltider fra ukemenyen", async () => {
    const taco = recipe("Taco");
    addToWeek(TEST_USER_ID, taco, "2026-11-09", 4, state.db!);
    addToWeek(TEST_USER_ID, taco, "2026-11-11", 4, state.db!);
    await show();
    const key = screen.getByRole("list", { name: "Kort fortalt" });
    expect(within(key).getAllByRole("listitem")[3]).toHaveTextContent("2planlagte middager");
    expect(card("Oftest i ukemenyen")).toHaveTextContent("Taco");
  });

  it("viser innloggingskravet uten innlogging", async () => {
    session.userId = null;
    await show();
    expect(screen.getByRole("link", { name: /logg inn/i })).toBeInTheDocument();
  });
});
