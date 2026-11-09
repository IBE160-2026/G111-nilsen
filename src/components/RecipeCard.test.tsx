// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import type { RecipeSummary } from "@/domain";
import RecipeCard from "./RecipeCard";

afterEach(cleanup);

const recipe: RecipeSummary = {
  id: 7,
  title: "Pannekaker",
  sourceName: "Matprat",
  sourceUrl: "https://www.matprat.no/x",
  savedAt: "2026-11-09T10:00:00.000Z",
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

  it("får fokus med Tab som ett tabstopp per kort", async () => {
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
    expect(screen.getByRole("link", { name: /Vafler/ })).toHaveFocus();
  });
});
