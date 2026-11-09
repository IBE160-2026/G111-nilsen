// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  it("viser fast format: tittel, kilde, porsjonsvelger, ingredienser og nummererte steg", () => {
    render(<RecipeView recipe={recipe} />);
    const title = screen.getByRole("heading", { level: 1, name: "Pannekaker" });
    const source = screen.getByText("Lagt inn selv");
    const stepper = screen.getByLabelText("Antall personer");
    const ingredients = screen.getByRole("region", { name: "Ingredienser" });
    const steps = screen.getByRole("region", { name: "Slik gjør du" });

    // Rekkefølgen i dokumentet er også rekkefølgen på mobil (én kolonne).
    const order = [title, source, stepper, ingredients, steps];
    for (let i = 1; i < order.length; i++) {
      expect(
        order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }

    expect(stepper).toHaveValue("4");
    expect(
      within(ingredients)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["1 ½ dl melk", "2 ss", "salt og pepper"]);

    const list = within(steps).getByRole("list");
    expect(list.tagName).toBe("OL");
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["Visp sammen.", "Stek."]);
  });

  it("har en «Rediger»-lenke ved tittelen som peker til redigeringssiden", () => {
    render(<RecipeView recipe={{ ...recipe, id: 7 }} />);
    const link = screen.getByRole("link", { name: "Rediger" });
    expect(link).toHaveAttribute("href", "/oppskrift/7/rediger");
    const title = screen.getByRole("heading", { level: 1, name: "Pannekaker" });
    expect(title.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("article")).toContainElement(link);
  });

  it("skjuler steg-kortet når oppskriften ikke har steg", () => {
    render(<RecipeView recipe={{ ...recipe, steps: [] }} />);
    expect(screen.queryByRole("heading", { name: "Slik gjør du" })).not.toBeInTheDocument();
  });

  it("viser stegene i lagret rekkefølge", () => {
    render(<RecipeView recipe={{ ...recipe, steps: [...recipe.steps].reverse() }} />);
    const list = within(screen.getByRole("region", { name: "Slik gjør du" })).getByRole("list");
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["Visp sammen.", "Stek."]);
  });

  it("viser ingen porsjonsvelger når oppskriften mangler opprinnelig antall", () => {
    render(<RecipeView recipe={{ ...recipe, originalServings: null }} />);
    expect(screen.queryByLabelText("Antall personer")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Ingredienser" })).toBeInTheDocument();
  });

  it("viser kilden når oppskriften har sourceUrl eller sourceName", () => {
    render(
      <RecipeView recipe={{ ...recipe, sourceUrl: "https://www.matprat.no/oppskrifter/x/" }} />,
    );
    expect(screen.getByText("matprat.no")).toBeInTheDocument();
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

  it("nullstiller valgt antall når komponenten får en annen oppskrift", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<RecipeView recipe={recipe} />);
    await user.click(screen.getByRole("button", { name: "Flere personer" }));
    expect(screen.getByLabelText("Antall personer")).toHaveValue("5");

    rerender(<RecipeView recipe={{ ...recipe, id: 2, title: "Vafler", originalServings: 2 }} />);
    expect(screen.getByLabelText("Antall personer")).toHaveValue("2");
    expect(screen.queryByRole("button", { name: /Tilbakestill/ })).not.toBeInTheDocument();
  });
});
