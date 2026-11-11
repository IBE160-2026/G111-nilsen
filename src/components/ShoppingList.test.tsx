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

  it("endrer antall porsjoner per oppskrift, også halve, og ignorerer ugyldig inntasting", async () => {
    const user = userEvent.setup();
    render(<ShoppingList recipes={recipes} />);
    await user.click(pick("Pannekaker"));
    const number = screen.getByLabelText("Antall porsjoner for Pannekaker");
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
    expect(screen.getByLabelText("Antall porsjoner for A")).toHaveValue(6);
    expect(items()).toEqual(["6 dl melkTil A"]);
    await user.click(pick("Uten antall"));
    expect(screen.queryByLabelText("Antall porsjoner for Uten antall")).not.toBeInTheDocument();
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

  it("dl-visning regner om før sammenslåing", async () => {
    const user = userEvent.setup();
    render(
      <ShoppingList recipes={[recipe(1, "A", ["1 cup milk"]), recipe(2, "B", ["1 dl milk"])]} />,
    );
    await user.click(pick("A"));
    await user.click(pick("B"));
    await user.click(screen.getByRole("radio", { name: "Volum (dl)" }));
    expect(items()).toEqual(["3,4 dl milk (ca.)Til A, B"]);
  });

  it("gram-visning slår sammen dl og gram av samme vare", async () => {
    const user = userEvent.setup();
    render(
      <ShoppingList recipes={[recipe(1, "A", ["2 dl mel"]), recipe(2, "B", ["400 g mel"])]} />,
    );
    await user.click(pick("A"));
    await user.click(pick("B"));
    await user.click(screen.getByRole("radio", { name: "Vekt (gram)" }));
    expect(items()).toEqual(["520 g mel (ca.)Til A, B"]);
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

  describe("Har hjemme", () => {
    const ok = (id: number, name: string) => ({ ok: true as const, item: { id, name } });

    it("viser ikke «Har hjemme» uten handlinger", () => {
      render(<ShoppingList recipes={recipes} />);
      expect(screen.queryByRole("heading", { name: "Har hjemme" })).not.toBeInTheDocument();
    });

    it("skjuler varer som allerede er hjemme, og sier hvor mange", async () => {
      const user = userEvent.setup();
      render(
        <ShoppingList
          recipes={recipes}
          pantry={[{ id: 1, name: "Egg" }]}
          onAddPantry={vi.fn()}
          onRemovePantry={vi.fn()}
        />,
      );
      await user.click(pick("Pannekaker"));
      expect(items().join("|")).not.toContain("egg");
      expect(screen.getByText("1 vare er skjult fordi du har den hjemme.")).toBeInTheDocument();
      expect(screen.getByText("2 varer")).toBeInTheDocument();
    });

    it("«Har hjemme» på en vare lagrer navnet, skjuler varen og melder fra", async () => {
      const user = userEvent.setup();
      const onAdd = vi.fn(() => Promise.resolve(ok(7, "egg")));
      render(<ShoppingList recipes={recipes} onAddPantry={onAdd} onRemovePantry={vi.fn()} />);
      await user.click(pick("Pannekaker"));
      await user.click(screen.getByRole("button", { name: "Har hjemme: egg" }));
      expect(onAdd).toHaveBeenCalledWith("egg");
      expect(items().join("|")).not.toContain("egg");
      expect(await screen.findByText("egg er lagt til i «Har hjemme».")).toBeInTheDocument();
      const section = screen
        .getByRole("heading", { level: 2, name: "Har hjemme" })
        .closest("section")!;
      expect(within(section).getByText("egg")).toBeInTheDocument();
    });

    it("knappen på varen veksler ikke avkryssingen", async () => {
      const user = userEvent.setup();
      render(
        <ShoppingList
          recipes={recipes}
          onAddPantry={vi.fn(() => Promise.resolve({ ok: false as const, message: "Feil." }))}
          onRemovePantry={vi.fn()}
        />,
      );
      await user.click(pick("Pannekaker"));
      await user.click(screen.getByRole("button", { name: "Har hjemme: egg" }));
      expect(screen.getByRole("checkbox", { name: /3 egg/ })).not.toBeChecked();
    });

    it("legger til selv med navnefeltet, tømmer feltet og sorterer listen", async () => {
      const user = userEvent.setup();
      const onAdd = vi
        .fn()
        .mockResolvedValueOnce(ok(1, "Salt"))
        .mockResolvedValueOnce(ok(2, "Olivenolje"));
      render(<ShoppingList recipes={recipes} onAddPantry={onAdd} onRemovePantry={vi.fn()} />);
      expect(screen.getByText("Ingenting ennå.")).toBeInTheDocument();
      const field = screen.getByLabelText("Legg til noe du har hjemme");
      await user.type(field, "Salt{Enter}");
      expect(onAdd).toHaveBeenCalledWith("Salt");
      await screen.findByText("Salt er lagt til i «Har hjemme».");
      expect(field).toHaveValue("");
      await user.type(field, "Olivenolje");
      await user.click(screen.getByRole("button", { name: "Legg til" }));
      await screen.findByText("Olivenolje er lagt til i «Har hjemme».");
      const section = screen
        .getByRole("heading", { level: 2, name: "Har hjemme" })
        .closest("section")!;
      expect(
        within(section)
          .getAllByRole("listitem")
          .map((li) => li.textContent),
      ).toEqual(["OlivenoljeLegg tilbake", "SaltLegg tilbake"]);
      expect(screen.queryByText("Ingenting ennå.")).not.toBeInTheDocument();
    });

    it("viser feilmeldingen under feltet og beholder det som er skrevet", async () => {
      const user = userEvent.setup();
      const onAdd = vi.fn(() =>
        Promise.resolve({
          ok: false as const,
          field: "name" as const,
          message: "Skriv hva du har hjemme.",
        }),
      );
      render(<ShoppingList recipes={recipes} onAddPantry={onAdd} onRemovePantry={vi.fn()} />);
      const field = screen.getByLabelText("Legg til noe du har hjemme");
      await user.type(field, " {Enter}");
      expect(await screen.findByRole("alert")).toHaveTextContent("Skriv hva du har hjemme.");
      expect(field).toHaveAttribute("aria-invalid", "true");
      expect(field).toHaveValue(" ");
    });

    it("«Legg tilbake» tar varen ut av «Har hjemme» så den vises igjen", async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn(() => Promise.resolve({ ok: true as const }));
      render(
        <ShoppingList
          recipes={recipes}
          pantry={[{ id: 4, name: "Egg" }]}
          onAddPantry={vi.fn()}
          onRemovePantry={onRemove}
        />,
      );
      await user.click(pick("Pannekaker"));
      await user.click(screen.getByRole("button", { name: "Legg tilbake på listen: Egg" }));
      expect(onRemove).toHaveBeenCalledWith(4);
      expect(items().join("|")).toContain("3 egg");
      expect(await screen.findByText("Egg er lagt tilbake på listen.")).toBeInTheDocument();
    });

    it("viser meldingen fra serveren når «Legg tilbake» feiler, og beholder oppføringen", async () => {
      const user = userEvent.setup();
      render(
        <ShoppingList
          recipes={recipes}
          pantry={[{ id: 4, name: "Egg" }]}
          onAddPantry={vi.fn()}
          onRemovePantry={vi.fn(() => Promise.resolve({ ok: false as const, message: "Nei." }))}
        />,
      );
      await user.click(screen.getByRole("button", { name: "Legg tilbake på listen: Egg" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("Nei.");
      expect(
        screen.getByRole("button", { name: "Legg tilbake på listen: Egg" }),
      ).toBeInTheDocument();
    });

    it("viser en generell melding og logger når handlingen kaster", async () => {
      const user = userEvent.setup();
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      render(
        <ShoppingList
          recipes={recipes}
          onAddPantry={vi.fn(() => Promise.reject(new Error("nett")))}
          onRemovePantry={vi.fn()}
        />,
      );
      await user.type(screen.getByLabelText("Legg til noe du har hjemme"), "Salt{Enter}");
      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(log).toHaveBeenCalled();
      log.mockRestore();
    });

    it("«Kopier listen» tar ikke med det som er hjemme", async () => {
      const user = userEvent.setup();
      const writeText = vi.fn(() => Promise.resolve());
      Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
      render(
        <ShoppingList
          recipes={recipes}
          pantry={[{ id: 1, name: "melk" }]}
          onAddPantry={vi.fn()}
          onRemovePantry={vi.fn()}
        />,
      );
      await user.click(pick("Pannekaker"));
      await user.click(screen.getByRole("button", { name: "Kopier listen" }));
      expect(writeText).toHaveBeenCalledWith("- 3 egg\n- 400 g mel");
    });
  });
});
