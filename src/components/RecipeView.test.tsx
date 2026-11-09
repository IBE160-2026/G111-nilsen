// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity } from "react";
import { afterEach, describe, expect, it } from "vitest";
import type { Recipe } from "@/domain";
import RecipeView from "./RecipeView";

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
    ).toEqual(["1.Visp sammen.", "2.Stek."]);
    // Hvert steg og hver ingrediens er en avkrysningsboks.
    expect(within(steps).getAllByRole("checkbox")).toHaveLength(2);
    expect(within(ingredients).getAllByRole("checkbox")).toHaveLength(3);
  });

  it("har en «Rediger»-lenke ved tittelen som peker til redigeringssiden", () => {
    render(<RecipeView recipe={{ ...recipe, id: 7 }} />);
    const link = screen.getByRole("link", { name: "Rediger Pannekaker" });
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
    ).toEqual(["1.Visp sammen.", "2.Stek."]);
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

  it("nullstiller valgt antall når komponenten får en annen oppskrift", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<RecipeView recipe={recipe} />);
    await user.click(screen.getByRole("button", { name: "Flere personer" }));
    expect(screen.getByLabelText("Antall personer")).toHaveValue("5");

    rerender(<RecipeView recipe={{ ...recipe, id: 2, title: "Vafler", originalServings: 2 }} />);
    expect(screen.getByLabelText("Antall personer")).toHaveValue("2");
    expect(screen.queryByRole("button", { name: /Tilbakestill/ })).not.toBeInTheDocument();
  });

  it("nullstiller valgt antall og avkrysning når samme oppskrift er lagret på nytt (updatedAt endret)", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<RecipeView recipe={recipe} />);
    await user.click(screen.getByRole("button", { name: "Flere personer" }));
    await user.click(screen.getByText("Stek."));
    await user.click(screen.getByText("melk"));

    rerender(
      <RecipeView
        recipe={{ ...recipe, originalServings: 2, updatedAt: "2026-11-09T11:00:00.000Z" }}
      />,
    );
    expect(screen.getByLabelText("Antall personer")).toHaveValue("2");
    for (const checkbox of screen.getAllByRole("checkbox")) expect(checkbox).not.toBeChecked();
  });

  it("Lik id: ingrediens og steg med id 1 krysses av uavhengig av hverandre", async () => {
    const user = userEvent.setup();
    render(<RecipeView recipe={recipe} />);
    const ingredients = screen.getByRole("region", { name: "Ingredienser" });
    const steps = screen.getByRole("region", { name: "Slik gjør du" });

    await user.click(within(ingredients).getByText("melk"));
    expect(within(ingredients).getByRole("checkbox", { name: "1 ½ dl melk" })).toBeChecked();
    expect(within(steps).getByRole("checkbox", { name: "Visp sammen." })).not.toBeChecked();

    await user.click(within(steps).getByText("Visp sammen."));
    expect(within(steps).getByRole("checkbox", { name: "Visp sammen." })).toBeChecked();
    await user.click(within(ingredients).getByText("melk"));
    expect(within(ingredients).getByRole("checkbox", { name: "1 ½ dl melk" })).not.toBeChecked();
    expect(within(steps).getByRole("checkbox", { name: "Visp sammen." })).toBeChecked();
  });

  it("Lukke og åpne: avkrysninger i ingredienser og steg nullstilles når Activity skjuler siden", async () => {
    const user = userEvent.setup();
    const view = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <RecipeView recipe={recipe} />
      </Activity>
    );
    const { rerender } = render(view("visible"));
    await user.click(screen.getByText("Stek."));
    await user.click(screen.getByText("melk"));
    rerender(view("hidden"));
    rerender(view("visible"));
    for (const checkbox of screen.getAllByRole("checkbox")) expect(checkbox).not.toBeChecked();
  });

  it("nullstiller avkrysning når komponenten får en annen oppskrift", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<RecipeView recipe={recipe} />);
    await user.click(screen.getByText("Stek."));
    rerender(<RecipeView recipe={{ ...recipe, id: 2, title: "Vafler" }} />);
    for (const checkbox of screen.getAllByRole("checkbox")) expect(checkbox).not.toBeChecked();
  });
});
