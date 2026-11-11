// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RecipeSummary } from "@/domain";

const actions = vi.hoisted(() => ({ setFavorite: vi.fn() }));
vi.mock("@/app/oppskrift/[id]/actions", () => actions);

const { default: RecipeCard } = await import("./RecipeCard");

beforeEach(() => actions.setFavorite.mockReset().mockResolvedValue({ ok: true }));
afterEach(cleanup);

const recipe: RecipeSummary = {
  id: 7,
  title: "Pannekaker",
  sourceName: "Matprat",
  sourceUrl: "https://www.matprat.no/x",
  savedAt: "2026-11-09T10:00:00.000Z",
  isFavorite: false,
  folderName: null,
};

describe("RecipeCard", () => {
  it("er én lenke til oppskriften med tittel og kilde", () => {
    render(<RecipeCard recipe={recipe} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/oppskrift/7");
    expect(links[0]).toHaveTextContent("Pannekaker");
    expect(links[0]).toHaveTextContent("Matprat");
  });

  it("viser kilde og mappenavn i metaraden, mappenavnet som egen <span>", () => {
    render(<RecipeCard recipe={{ ...recipe, folderName: "Hverdag" }} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAccessibleName("Pannekaker Matprat · Hverdag");
    expect(screen.getByText("Hverdag").tagName).toBe("SPAN");
    expect(screen.getByText("Matprat").tagName).toBe("SPAN");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Pannekaker");
  });

  it("uten mappe vises bare kilden", () => {
    render(<RecipeCard recipe={recipe} />);
    expect(screen.getByRole("link")).toHaveAccessibleName("Pannekaker Matprat");
    expect(screen.getByRole("link")).not.toHaveTextContent("·");
  });

  it("utelater mappenavnet med showFolder={false}", () => {
    render(<RecipeCard recipe={{ ...recipe, folderName: "Hverdag" }} showFolder={false} />);
    expect(screen.queryByText("Hverdag")).not.toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveTextContent("Matprat");
  });

  it("har tittelen som <h2>", () => {
    render(<RecipeCard recipe={recipe} />);
    expect(screen.getByRole("heading", { level: 2, name: "Pannekaker" })).toBeInTheDocument();
  });

  it.each([
    [{ sourceName: null, sourceUrl: "https://www.matprat.no/x" }, "matprat.no"],
    [{ sourceName: null, sourceUrl: null }, "Lagt inn selv"],
  ])("viser kilden for %j som %s", (source, expected) => {
    render(<RecipeCard recipe={{ ...recipe, ...source }} />);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("rendrer en lang tittel uten mellomrom (brytingen testes i nettleser)", () => {
    const title = "a".repeat(200);
    render(<RecipeCard recipe={{ ...recipe, title }} />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(title);
  });

  it("tabrekkefølge: lenke, så hjerte, per kort", async () => {
    render(
      <>
        <RecipeCard recipe={recipe} />
        <RecipeCard recipe={{ ...recipe, id: 8, title: "Vafler" }} />
      </>,
    );
    const user = userEvent.setup();
    await user.tab();
    expect(screen.getByRole("link", { name: /Pannekaker/ })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Favoritt: Pannekaker" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: /Vafler/ })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Favoritt: Vafler" })).toHaveFocus();
  });
});

describe("RecipeCard: hjerte (Story 3.4)", () => {
  it("hjertet er en søsken til lenken, aldri inni den", () => {
    render(<RecipeCard recipe={recipe} />);
    const link = screen.getByRole("link");
    const heart = screen.getByRole("button", { name: "Favoritt: Pannekaker" });
    expect(link).not.toContainElement(heart);
    expect(link.querySelector("button")).toBeNull();
    expect(heart.parentElement).toBe(link.parentElement);
    expect(link.compareDocumentPosition(heart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("lenkens tilgjengelige navn er uendret av hjertet", () => {
    render(<RecipeCard recipe={{ ...recipe, folderName: "Hverdag" }} />);
    expect(screen.getByRole("link")).toHaveAccessibleName("Pannekaker Matprat · Hverdag");
  });

  it.each([false, true])("aria-pressed følger isFavorite=%s", (isFavorite) => {
    render(<RecipeCard recipe={{ ...recipe, isFavorite }} />);
    expect(screen.getByRole("button", { name: "Favoritt: Pannekaker" })).toHaveAttribute(
      "aria-pressed",
      String(isFavorite),
    );
  });

  it("trykk på hjertet kaller setFavorite med oppskriftens id og eksplisitt verdi, uten å åpne oppskriften", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn((event: Event) => event.preventDefault());
    document.addEventListener("click", onClick);
    try {
      render(<RecipeCard recipe={recipe} />);
      await user.click(screen.getByRole("button", { name: "Favoritt: Pannekaker" }));
      expect(actions.setFavorite).toHaveBeenCalledExactlyOnceWith(7, true);
      // Klikket treffer bare knappen: ingen lenke var målet.
      expect(
        onClick.mock.calls.every(([event]) => (event.target as Element).closest("a") === null),
      ).toBe(true);
    } finally {
      document.removeEventListener("click", onClick);
    }
  });

  it("avmarkering sender false", async () => {
    const user = userEvent.setup();
    render(<RecipeCard recipe={{ ...recipe, isFavorite: true }} />);
    await user.click(screen.getByRole("button", { name: "Favoritt: Pannekaker" }));
    expect(actions.setFavorite).toHaveBeenCalledExactlyOnceWith(7, false);
  });

  it("feil fra handlingen: hjertet rulles tilbake og meldingen vises på kortet", async () => {
    const user = userEvent.setup();
    actions.setFavorite.mockResolvedValue({ ok: false, message: "Vi fant ikke oppskriften." });
    render(<RecipeCard recipe={recipe} />);
    await user.click(screen.getByRole("button", { name: "Favoritt: Pannekaker" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Vi fant ikke oppskriften.");
    expect(screen.getByRole("button", { name: "Favoritt: Pannekaker" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("lang tittel og 40-tegns mappenavn uten mellomrom: hjertet og teksten rendres side om side", () => {
    const folderName = "m".repeat(40);
    render(
      <RecipeCard recipe={{ ...recipe, title: "a".repeat(120), folderName, isFavorite: true }} />,
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("a".repeat(120));
    expect(screen.getByText(folderName)).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});

describe("RecipeCard: tid (Story 6.2)", () => {
  it("viser tiden i kortet når den finnes", () => {
    render(<RecipeCard recipe={{ ...recipe, totalMinutes: 75 }} />);
    expect(screen.getByText("Tid: 1 t 15 min")).toBeInTheDocument();
    cleanup();
    render(<RecipeCard recipe={recipe} />);
    expect(screen.queryByText(/^Tid:/)).not.toBeInTheDocument();
  });

  it("viser merkelappene som en liste i lenken, og ingen liste uten", () => {
    const { rerender } = render(
      <RecipeCard recipe={{ ...recipe, labels: ["Hverdag", "Vegetar"] }} />,
    );
    const list = screen.getByRole("list", { name: "Merkelapper" });
    expect(list).toHaveTextContent("HverdagVegetar");
    expect(screen.getByRole("link")).toContainElement(list);
    rerender(<RecipeCard recipe={{ ...recipe, labels: [] }} />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    rerender(<RecipeCard recipe={recipe} />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
