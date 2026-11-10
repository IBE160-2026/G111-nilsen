// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, type Db } from "@/server/db/client";
import { insertRecipe, type NewRecipe } from "@/server/db/repositories/recipe-repository";
import { createFolder, moveRecipeToFolder } from "@/server/services/folder-service";
import { setFavorite } from "@/server/services/recipe-service";

const state = vi.hoisted(() => ({
  db: null as Db | null,
  forcedErrorKind: null as string | null,
  calls: [] as string[],
}));

vi.mock("@/server/db/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/db/client")>();
  return { ...actual, getDb: () => state.db! };
});

vi.mock("@/server/services/recipe-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/services/recipe-service")>();
  return {
    ...actual,
    listFavorites: (...args: Parameters<typeof actual.listFavorites>) => {
      state.calls.push("listFavorites");
      return state.forcedErrorKind
        ? { ok: false, error: { kind: state.forcedErrorKind } }
        : actual.listFavorites(...args);
    },
  };
});

vi.mock("@/app/oppskrift/[id]/actions", () => ({ setFavorite: vi.fn() }));

vi.mock("next/server", () => ({
  connection: () => {
    state.calls.push("connection");
    return Promise.resolve();
  },
}));

const { default: FavoritterPage, metadata } = await import("./page");

afterEach(cleanup);
beforeEach(() => {
  state.db = createTestDb();
  state.forcedErrorKind = null;
  state.calls = [];
});

const recipe = (title: string, savedAt: string | null, extra: Partial<NewRecipe> = {}) => ({
  title,
  sourceUrl: null,
  sourceName: null,
  originalServings: 4,
  selectedServings: null,
  savedAt,
  createdAt: "2026-11-09T10:00:00.000Z",
  updatedAt: "2026-11-09T10:00:00.000Z",
  ingredients: [],
  steps: [],
  ...extra,
});

/** Lagrer en oppskrift og markerer den som favoritt. */
function favorite(title: string, savedAt: string, extra: Partial<NewRecipe> = {}): number {
  const id = insertRecipe(state.db!, recipe(title, savedAt, extra));
  setFavorite(id, true, state.db!);
  return id;
}

type AsyncComponent = (props: unknown) => Promise<ReactElement>;

/** Rammen (FavoriteFeedback), overskriften utenfor Suspense og den asynkrone delen inne i grensen. */
async function renderPage() {
  const frame = FavoritterPage() as ReactElement<{ headingId: string; children: ReactElement }>;
  const root = frame.props.children as ReactElement<{ children: ReactElement[] }>;
  const [heading, suspense] = root.props.children as [
    ReactElement,
    ReactElement<{ children: ReactElement; fallback: ReactElement }>,
  ];
  const loader = suspense.props.children;
  return {
    frame,
    heading,
    fallback: suspense.props.fallback,
    content: await (loader.type as AsyncComponent)(loader.props),
  };
}

async function show() {
  const { frame, content } = await renderPage();
  // Samme tre som siden: FavoriteFeedback rundt overskrift og innhold.
  const root = frame.props.children as ReactElement<{ children: ReactElement[] }>;
  const [heading] = root.props.children;
  const Frame = frame.type as React.ComponentType<{ headingId: string; children: React.ReactNode }>;
  return render(
    <Frame headingId={frame.props.headingId}>
      {heading}
      {content}
    </Frame>,
  );
}

describe("/favoritter", () => {
  it("har fanetittel, overskrift utenfor Suspense og en reservetekst", async () => {
    expect(metadata.title).toBe("Favoritter");
    const { heading, fallback } = await renderPage();
    render(heading);
    const h1 = screen.getByRole("heading", { level: 1, name: "Favoritter" });
    // Mål for fokusflytting når et avmarkert kort forsvinner.
    expect(h1).toHaveAttribute("tabindex", "-1");
    expect(h1.id).not.toBe("");
    render(fallback);
    expect(screen.getByText("Henter favorittene …")).toBeInTheDocument();
  });

  it("overskriftens id er det FavoriteFeedback flytter fokus til", async () => {
    const { frame, heading } = await renderPage();
    expect(frame.props.headingId).toBe((heading.props as { id: string }).id);
  });

  it("kaller connection() før databasen leses (ikke ved bygging)", async () => {
    await renderPage();
    expect(state.calls).toEqual(["connection", "listFavorites"]);
  });

  it("uten favoritter: tom-tilstand med uendret tittel og tekst og «Gå til oppskriftene»", async () => {
    // En lagret oppskrift som ikke er favoritt, vises ikke.
    insertRecipe(state.db!, recipe("Ikke favoritt", "2026-11-09T10:00:00.000Z"));
    await show();
    expect(
      screen.getByRole("heading", { level: 2, name: "Du har ingen favoritter ennå." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Trykk på hjertet på en oppskrift for å gjøre den til favoritt."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gå til oppskriftene" })).toHaveAttribute(
      "href",
      "/oppskrifter",
    );
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByText("Ikke favoritt")).not.toBeInTheDocument();
  });

  it("viser favorittene som kort, sist lagret først, alle med fylt hjerte", async () => {
    const old = favorite("Eldst", "2026-11-09T09:00:00.000Z");
    const recent = favorite("Nyest", "2026-11-09T11:00:00.000Z", { sourceName: "Matprat" });
    insertRecipe(state.db!, recipe("Ikke favoritt", "2026-11-09T12:00:00.000Z"));
    await show();

    const list = screen.getByRole("list");
    expect(list).toHaveAttribute("role", "list");
    const items = within(list).getAllByRole("listitem");
    expect(items.map((li) => within(li).getByRole("heading").textContent)).toEqual([
      "Nyest",
      "Eldst",
    ]);
    expect(within(items[0]).getByRole("link")).toHaveAttribute("href", `/oppskrift/${recent}`);
    expect(within(items[1]).getByRole("link")).toHaveAttribute("href", `/oppskrift/${old}`);
    for (const item of items) {
      expect(within(item).getByRole("button", { name: /^Favoritt: / })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    }
    expect(
      screen.queryByRole("heading", { name: "Du har ingen favoritter ennå." }),
    ).not.toBeInTheDocument();
  });

  it("viser kilde og mappenavn i meta: «Matprat · Hverdag»", async () => {
    createFolder("Hverdag", state.db!);
    const id = favorite("I mappe", "2026-11-09T11:00:00.000Z", { sourceName: "Matprat" });
    moveRecipeToFolder(id, 1, state.db!);
    await show();
    expect(screen.getByRole("link")).toHaveAccessibleName("I mappe Matprat · Hverdag");
  });

  it("en favoritt som er avmarkert, er borte ved neste lesing, og siste gir tom-tilstand", async () => {
    const id = favorite("Pannekaker", "2026-11-09T11:00:00.000Z");
    await show();
    expect(screen.getByRole("heading", { level: 2, name: "Pannekaker" })).toBeInTheDocument();
    cleanup();
    setFavorite(id, false, state.db!);
    await show();
    expect(screen.queryByText("Pannekaker")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Du har ingen favoritter ennå." }),
    ).toBeInTheDocument();
  });

  it("en slettet oppskrift forsvinner fra favorittene", async () => {
    const id = favorite("Pannekaker", "2026-11-09T11:00:00.000Z");
    state.db!.$client.prepare("delete from recipes where id = ?").run(id);
    await show();
    expect(screen.queryByText("Pannekaker")).not.toBeInTheDocument();
  });

  it("har et statusområde som står i DOM også når listen er tom", async () => {
    await show();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("avmarkering på et kort: kunngjøres i statusområdet, og fokus flyttes til overskriften når kortet forsvinner", async () => {
    const { setFavorite: action } = await import("@/app/oppskrift/[id]/actions");
    vi.mocked(action).mockResolvedValue({ ok: true });
    favorite("Pannekaker", "2026-11-09T11:00:00.000Z");
    const user = userEvent.setup();
    const view = await show();
    await user.click(screen.getByRole("button", { name: "Favoritt: Pannekaker" }));
    expect(action).toHaveBeenCalledWith(1, false);
    expect(await screen.findByText("Fjernet fra favoritter.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Fjernet fra favoritter.");

    // Revalidering gir en ny side uten kortet.
    state.db!.$client.prepare("update recipes set is_favorite = 0").run();
    const { frame, content } = await renderPage();
    const root = frame.props.children as ReactElement<{ children: ReactElement[] }>;
    const [heading] = root.props.children;
    view.rerender(
      <frame.type headingId={frame.props.headingId}>
        {heading}
        {content}
      </frame.type>,
    );
    expect(screen.queryByRole("button", { name: /Favoritt/ })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Favoritter" })).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("Fjernet fra favoritter.");
    expect(
      screen.getByRole("heading", { level: 2, name: "Du har ingen favoritter ennå." }),
    ).toBeInTheDocument();
  });

  it("kaster en feil til error.tsx når lesingen feiler, i stedet for å vise tom-tilstand", async () => {
    state.forcedErrorKind = "unknown";
    await expect(renderPage()).rejects.toThrow(/Kunne ikke hente favorittene \(unknown\)/);
  });
});
