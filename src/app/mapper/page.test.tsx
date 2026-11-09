// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, type Db } from "@/server/db/client";
import { insertRecipe } from "@/server/db/repositories/recipe-repository";
import { createFolder, moveRecipeToFolder } from "@/server/services/folder-service";

const state = vi.hoisted(() => ({
  db: null as Db | null,
  forcedErrorKind: null as string | null,
  calls: [] as string[],
}));

vi.mock("@/server/db/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/db/client")>();
  return { ...actual, getDb: () => state.db! };
});

vi.mock("@/server/services/folder-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/services/folder-service")>();
  return {
    ...actual,
    listFolders: (...args: Parameters<typeof actual.listFolders>) => {
      state.calls.push("listFolders");
      return state.forcedErrorKind
        ? { ok: false, error: { kind: state.forcedErrorKind } }
        : actual.listFolders(...args);
    },
  };
});

vi.mock("next/server", () => ({
  connection: () => {
    state.calls.push("connection");
    return Promise.resolve();
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { default: MapperPage } = await import("./page");

afterEach(cleanup);
beforeEach(() => {
  state.db = createTestDb();
  state.forcedErrorKind = null;
  state.calls = [];
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

type AsyncComponent = (props: unknown) => Promise<ReactElement>;

async function renderPage() {
  const page = MapperPage() as ReactElement<{ children: ReactElement[] }>;
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

describe("/mapper", () => {
  it("har overskriften utenfor Suspense og en reservetekst", async () => {
    const { heading, fallback } = await renderPage();
    render(heading);
    expect(screen.getByRole("heading", { level: 1, name: "Mapper" })).toBeInTheDocument();
    render(fallback);
    expect(screen.getByText("Henter mappene …")).toBeInTheDocument();
  });

  it("kaller connection() før databasen leses", async () => {
    await renderPage();
    expect(state.calls).toEqual(["connection", "listFolders"]);
  });

  it("uten mapper: skjemaet «Ny mappe» og tom-tilstanden under det", async () => {
    await show();
    const form = screen.getByRole("textbox", { name: "Ny mappe" });
    const empty = screen.getByRole("heading", { level: 2, name: "Du har ingen mapper ennå." });
    expect(form.compareDocumentPosition(empty) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("button", { name: "Opprett mappe" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gå til oppskriftene" })).toHaveAttribute(
      "href",
      "/samlingen",
    );
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("viser mappene alfabetisk med antall oppskrifter og lenke til mappesiden", async () => {
    createFolder("Hverdag", state.db!);
    createFolder("Helg", state.db!);
    createFolder("Tom", state.db!);
    for (const title of ["A", "B"]) {
      const id = insertRecipe(state.db!, {
        title,
        sourceUrl: null,
        sourceName: null,
        originalServings: 4,
        selectedServings: null,
        savedAt: "2026-11-09T10:00:00.000Z",
        createdAt: "2026-11-09T10:00:00.000Z",
        updatedAt: "2026-11-09T10:00:00.000Z",
        ingredients: [],
        steps: [],
      });
      moveRecipeToFolder(id, 1, state.db!);
    }
    await show();

    const list = screen.getByRole("list");
    expect(list).toHaveAttribute("role", "list");
    const items = within(list).getAllByRole("listitem");
    expect(items.map((li) => within(li).getByRole("link").textContent)).toEqual([
      "Helg Ingen oppskrifter",
      "Hverdag 2 oppskrifter",
      "Tom Ingen oppskrifter",
    ]);
    expect(within(items[1]).getByRole("link")).toHaveAttribute("href", "/mapper/1");
    expect(
      screen.queryByRole("heading", { name: "Du har ingen mapper ennå." }),
    ).not.toBeInTheDocument();
  });

  it("kaster en feil til error.tsx når lesingen feiler", async () => {
    state.forcedErrorKind = "unknown";
    await expect(renderPage()).rejects.toThrow(/Kunne ikke hente mappene \(unknown\)/);
  });
});
