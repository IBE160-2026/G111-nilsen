// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseLine, type ShoppingRecipe } from "@/domain";
import ShoppingList from "./ShoppingList";

afterEach(cleanup);

function recipe(id: number, title: string, lines: string[], extra: Partial<ShoppingRecipe> = {}) {
  return {
    id,
    title,
    originalServings: 4,
    selectedServings: null,
    ingredients: lines.map((text, i) => ({
      ...parseLine(text),
      id: id * 100 + i,
      position: i + 1,
      section: null,
    })),
    ...extra,
  } satisfies ShoppingRecipe;
}

const recipes = [
  recipe(1, "Pannekaker", ["4 dl melk", "3 egg", "400 g mel"]),
  recipe(2, "Vafler", ["2 dl melk", "2 egg"]),
  recipe(3, "Uten antall", ["1 ss smør"], { originalServings: null }),
];
const pick = (title: string) => screen.getByRole("checkbox", { name: title });
const items = () =>
  within(screen.getByRole("heading", { name: "Du må kjøpe" }).closest("section")!)
    .queryAllByRole("listitem")
    .map((li) => li.textContent);

describe("ShoppingList", () => {
  it("viser en tom liste med veiledning til noe er valgt", () => {
    render(<ShoppingList recipes={recipes} />);
    expect(screen.getByText("Velg minst én oppskrift for å lage en liste.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Kopier listen" })).not.toBeInTheDocument();
  });

  it("slår sammen ingrediensene fra valgte oppskrifter og viser hvilke de er til", async () => {
    const user = userEvent.setup();
    render(<ShoppingList recipes={recipes} />);
    await user.click(pick("Pannekaker"));
    await user.click(pick("Vafler"));
    expect(items()).toEqual([
      "5 eggTil Pannekaker, Vafler",
      "400 g melTil Pannekaker",
      "6 dl melkTil Pannekaker, Vafler",
    ]);
    expect(screen.getByText("3 varer")).toBeInTheDocument();
    await user.click(pick("Vafler"));
    expect(items()).toEqual([
      "3 eggTil Pannekaker",
      "400 g melTil Pannekaker",
      "4 dl melkTil Pannekaker",
    ]);
  });

  it("endrer antall personer per oppskrift, også halve, og ignorerer ugyldig inntasting", async () => {
    const user = userEvent.setup();
    render(<ShoppingList recipes={recipes} />);
    await user.click(pick("Pannekaker"));
    const number = screen.getByLabelText("Antall personer for Pannekaker");
    expect(number).toHaveValue(4);
    fireEvent.change(number, { target: { value: "8" } });
    expect(items()).toContain("8 dl melkTil Pannekaker");
    fireEvent.change(number, { target: { value: "4.5" } });
    expect(items()).toContain("4 ½ dl melkTil Pannekaker");
    fireEvent.change(number, { target: { value: "4.3" } });
    expect(items()).toContain("4 ½ dl melkTil Pannekaker");
    fireEvent.change(number, { target: { value: "0" } });
    expect(items()).toContain("4 ½ dl melkTil Pannekaker");
  });

  it("starter på sist valgte antall, og oppskrift uten antall har ingen antallsfelt", async () => {
    const user = userEvent.setup();
    render(
      <ShoppingList
        recipes={[recipe(1, "A", ["4 dl melk"], { selectedServings: 6 }), recipes[2]]}
      />,
    );
    await user.click(pick("A"));
    expect(screen.getByLabelText("Antall personer for A")).toHaveValue(6);
    expect(items()).toEqual(["6 dl melkTil A"]);
    await user.click(pick("Uten antall"));
    expect(screen.queryByLabelText("Antall personer for Uten antall")).not.toBeInTheDocument();
  });

  it("avkrysning består når utvalget endres", async () => {
    const user = userEvent.setup();
    render(<ShoppingList recipes={recipes} />);
    await user.click(pick("Pannekaker"));
    await user.click(screen.getByRole("checkbox", { name: /400 g mel/ }));
    await user.click(pick("Vafler"));
    expect(screen.getByRole("checkbox", { name: /400 g mel/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /6 dl melk/ })).not.toBeChecked();
  });

  it("metriske mål regnes om før sammenslåing", async () => {
    const user = userEvent.setup();
    render(
      <ShoppingList recipes={[recipe(1, "A", ["1 cup milk"]), recipe(2, "B", ["1 dl milk"])]} />,
    );
    await user.click(pick("A"));
    await user.click(pick("B"));
    await user.click(screen.getByLabelText("Vis i metriske mål"));
    expect(items()).toEqual(["3,4 dl milk (ca.)Til A, B"]);
  });

  it("«Kopier listen» kopierer bare det som ikke er krysset av, og melder fra", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<ShoppingList recipes={recipes} />);
    await user.click(pick("Pannekaker"));
    await user.click(screen.getByRole("checkbox", { name: /3 egg/ }));
    await user.click(screen.getByRole("button", { name: "Kopier listen" }));
    expect(writeText).toHaveBeenCalledWith("- 400 g mel\n- 4 dl melk");
    expect(await screen.findByText("Listen er kopiert.")).toBeInTheDocument();

    writeText.mockRejectedValueOnce(new Error("nei"));
    await user.click(screen.getByRole("button", { name: "Kopier listen" }));
    expect(
      await screen.findByText("Kunne ikke kopiere. Marker teksten og kopier selv."),
    ).toBeInTheDocument();
  });
});
