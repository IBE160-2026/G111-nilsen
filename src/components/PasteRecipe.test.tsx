// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PasteRecipe from "./PasteRecipe";

afterEach(cleanup);

const TEXT = `Pannekaker
4 porsjoner
Ingredienser
3 dl hvetemel
5 dl melk
Fremgangsmåte
1. Visp.
2. Stek.`;

function paste(text: string) {
  fireEvent.change(screen.getByLabelText("Oppskriften som tekst"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Lag utkast" }));
}

describe("PasteRecipe", () => {
  it("ber om tekst når feltet er tomt, og viser ikke noe skjema", () => {
    render(<PasteRecipe action={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Lag utkast" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Lim inn teksten først.");
    expect(screen.queryByRole("heading", { name: "Sjekk utkastet" })).toBeNull();
  });

  it("fyller det vanlige skjemaet med utkastet", () => {
    render(<PasteRecipe action={vi.fn()} />);
    paste(TEXT);
    expect(screen.getByRole("heading", { name: "Sjekk utkastet" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Tittel/)).toHaveValue("Pannekaker");
    expect(screen.getByLabelText(/Antall porsjoner/)).toHaveValue("4");
    expect(screen.getByLabelText(/Ingredienser/)).toHaveValue("3 dl hvetemel\n5 dl melk");
    expect(screen.getByLabelText(/Steg|Fremgangsmåte/)).toHaveValue("Visp.\nStek.");
    expect(screen.getByRole("button", { name: "Lagre oppskrift" })).toBeInTheDocument();
  });

  it("gir et nytt utkast når teksten limes inn på nytt", () => {
    render(<PasteRecipe action={vi.fn()} />);
    paste(TEXT);
    paste("Suppe\nIngredienser\n2 gulrøtter");
    expect(screen.getByLabelText(/Tittel/)).toHaveValue("Suppe");
    expect(screen.getByLabelText(/Ingredienser/)).toHaveValue("2 gulrøtter");
  });

  it("sier fra når teksten ikke ga ingredienser", () => {
    render(<PasteRecipe action={vi.fn()} />);
    paste("Bare en tittel");
    expect(screen.getByText(/Fant ingen ingredienser/)).toBeInTheDocument();
  });
});
