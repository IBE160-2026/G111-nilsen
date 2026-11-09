// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Recipe } from "@/domain";
import RecipeView, { sourceLabel } from "./RecipeView";

afterEach(cleanup);

const recipe: Recipe = {
  id: 1,
  title: "Pannekaker",
  sourceUrl: null,
  sourceName: null,
  originalServings: 4,
  selectedServings: null,
  savedAt: null,
  createdAt: "2026-11-09T10:00:00.000Z",
  updatedAt: "2026-11-09T10:00:00.000Z",
  ingredients: [
    {
      id: 1,
      position: 0,
      section: null,
      original: "1 ½ dl melk",
      quantity: { min: 1.5 },
      unit: "dl",
      name: "melk",
      parseable: true,
    },
    {
      id: 2,
      position: 1,
      section: null,
      original: "2 ss",
      quantity: { min: 2 },
      unit: "ss",
      name: "",
      parseable: true,
    },
    {
      id: 3,
      position: 2,
      section: null,
      original: "salt og pepper",
      quantity: null,
      unit: null,
      name: "salt og pepper",
      parseable: false,
    },
  ],
  steps: [
    { id: 1, position: 0, section: null, text: "Visp sammen." },
    { id: 2, position: 1, section: null, text: "Stek." },
  ],
};

describe("RecipeView", () => {
  it("viser tittel, «Lagt inn selv», antall personer, ingredienser og nummererte steg", () => {
    render(<RecipeView recipe={recipe} />);
    expect(screen.getByRole("heading", { level: 1, name: "Pannekaker" })).toBeInTheDocument();
    expect(screen.getByText(/Lagt inn selv/)).toHaveTextContent("Lagt inn selv · 4 personer");

    const items = within(screen.getAllByRole("list")[0]).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "1 ½ dl melk",
      "2 ss",
      "salt og pepper",
    ]);

    const steps = screen.getAllByRole("list")[1];
    expect(steps.tagName).toBe("OL");
    expect(
      within(steps)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["Visp sammen.", "Stek."]);
  });

  it("skjuler steg-kortet når oppskriften ikke har steg, og bruker entall for 1 person", () => {
    render(<RecipeView recipe={{ ...recipe, originalServings: 1, steps: [] }} />);
    expect(screen.queryByRole("heading", { name: "Slik gjør du" })).not.toBeInTheDocument();
    expect(screen.getByText(/Lagt inn selv/)).toHaveTextContent("Lagt inn selv · 1 person");
  });

  it("viser kilden når oppskriften har sourceUrl eller sourceName", () => {
    render(
      <RecipeView recipe={{ ...recipe, sourceUrl: "https://www.matprat.no/oppskrifter/x/" }} />,
    );
    expect(screen.getByText(/matprat\.no/)).toHaveTextContent("matprat.no · 4 personer");
    expect(screen.queryByText(/Lagt inn selv/)).not.toBeInTheDocument();
  });

  it.each([
    [{ sourceName: "Matprat", sourceUrl: "https://www.matprat.no/x" }, "Matprat"],
    [{ sourceName: null, sourceUrl: "https://www.matprat.no/x" }, "matprat.no"],
    [{ sourceName: "  ", sourceUrl: "https://example.com/a" }, "example.com"],
    [{ sourceName: null, sourceUrl: "ikke en lenke" }, "Lagt inn selv"],
    [{ sourceName: null, sourceUrl: null }, "Lagt inn selv"],
  ])("sourceLabel(%j) = %s", (source, expected) => {
    expect(sourceLabel(source)).toBe(expected);
  });
});
