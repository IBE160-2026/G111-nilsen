// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseLine, type ShoppingRecipe } from "@/domain";
import { OFFLINE_LIST_KEY, parseOfflineList } from "@/lib/offline-list";
import ShoppingList from "./ShoppingList";

beforeEach(() => {
  // jsdom mangler <dialog>-metodene som «Tøm listen» bruker.
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});
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

    it("«Tøm listen» spør først, tømmer «Har hjemme» og legger varene tilbake", async () => {
      const user = userEvent.setup();
      const onClear = vi.fn(() => Promise.resolve({ ok: true as const }));
      render(
        <ShoppingList
          recipes={recipes}
          pantry={[{ id: 1, name: "Egg" }]}
          onAddPantry={vi.fn()}
          onRemovePantry={vi.fn()}
          onClearPantry={onClear}
        />,
      );
      await user.click(pick("Pannekaker"));
      expect(items().join("|")).not.toContain("egg");
      await user.click(screen.getByRole("button", { name: "Tøm listen" }));
      expect(onClear).not.toHaveBeenCalled();
      await user.click(screen.getByRole("button", { name: "Tøm" }));
      expect(onClear).toHaveBeenCalledTimes(1);
      expect(await screen.findByText("«Har hjemme» er tømt.")).toBeInTheDocument();
      expect(items().join("|")).toContain("egg");
      expect(screen.getByText("Ingenting ennå.")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Tøm listen" })).not.toBeInTheDocument();
    });

    it("«Avbryt» i «Tøm listen» lar alt stå, og en feil vises", async () => {
      const user = userEvent.setup();
      const onClear = vi.fn(() => Promise.resolve({ ok: false as const, message: "Feil." }));
      render(
        <ShoppingList
          recipes={recipes}
          pantry={[{ id: 1, name: "Egg" }]}
          onAddPantry={vi.fn()}
          onRemovePantry={vi.fn()}
          onClearPantry={onClear}
        />,
      );
      await user.click(screen.getByRole("button", { name: "Tøm listen" }));
      await user.click(screen.getByRole("button", { name: "Avbryt" }));
      expect(onClear).not.toHaveBeenCalled();
      await user.click(screen.getByRole("button", { name: "Tøm listen" }));
      await user.click(screen.getByRole("button", { name: "Tøm" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("Feil.");
      expect(screen.getByText("Egg")).toBeInTheDocument();
    });

    it("lagrer avkrysninger for en uke, husker dem og ruller tilbake når lagringen feiler", async () => {
      const user = userEvent.setup();
      const onChange = vi
        .fn()
        .mockResolvedValueOnce({ ok: true as const })
        .mockResolvedValueOnce({ ok: false as const, message: "Kunne ikke lagre." });
      render(
        <ShoppingList
          recipes={recipes}
          initialSelection={{ 1: 4 }}
          weekChecks={{ initial: ["egg|"], onChange }}
        />,
      );
      expect(screen.getByRole("checkbox", { name: /3 egg/ })).toBeChecked();
      await user.click(screen.getByRole("checkbox", { name: /4 dl melk/ }));
      expect(onChange).toHaveBeenLastCalledWith("melk|dl", true);
      expect(screen.getByRole("checkbox", { name: /4 dl melk/ })).toBeChecked();
      await user.click(screen.getByRole("checkbox", { name: /3 egg/ }));
      expect(onChange).toHaveBeenLastCalledWith("egg|", false);
      expect(await screen.findByText("Kunne ikke lagre.")).toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: /3 egg/ })).toBeChecked();
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

  describe("søk i oppskriftene", () => {
    const visible = () =>
      within(screen.getByRole("heading", { name: "Velg oppskrifter" }).closest("section")!)
        .getAllByRole("checkbox")
        .map((box) => box.getAttribute("aria-label") ?? box.closest("label")?.textContent);

    it("filtrerer på tittel, uavhengig av store bokstaver og aksenter, og melder antall treff", async () => {
      const user = userEvent.setup();
      render(<ShoppingList recipes={[...recipes, recipe(4, "Crème brûlée", ["2 dl fløte"])]} />);
      expect(visible()).toEqual(["Pannekaker", "Vafler", "Uten antall", "Crème brûlée"]);
      await user.type(screen.getByRole("searchbox", { name: "Søk etter oppskrift" }), "CREME");
      expect(visible()).toEqual(["Crème brûlée"]);
      expect(screen.getByText("1 oppskrift passer.")).toBeInTheDocument();
      await user.clear(screen.getByRole("searchbox", { name: "Søk etter oppskrift" }));
      expect(visible()).toHaveLength(4);
      expect(screen.queryByText(/oppskrift(er)? passer/)).not.toBeInTheDocument();
    });

    it("sier fra når ingen passer, og beholder valgte oppskrifter synlige", async () => {
      const user = userEvent.setup();
      render(<ShoppingList recipes={recipes} />);
      await user.click(pick("Vafler"));
      const search = screen.getByRole("searchbox", { name: "Søk etter oppskrift" });
      await user.type(search, "lasagne");
      expect(screen.getByText("Ingen lagrede oppskrifter passer «lasagne».")).toBeInTheDocument();
      expect(visible()).toEqual(["Vafler"]);
      await user.clear(search);
      await user.type(search, "pann");
      expect(visible()).toEqual(["Pannekaker", "Vafler"]);
      // Listen «Du må kjøpe» påvirkes ikke av søket.
      expect(items()).toEqual(["2 eggTil Vafler", "2 dl melkTil Vafler"]);
    });
  });

  describe("nullstilling når man forlater siden", () => {
    function Host({
      mode,
      ...props
    }: { mode: "visible" | "hidden" } & Parameters<typeof ShoppingList>[0]) {
      return (
        <Activity mode={mode}>
          <ShoppingList {...props} />
        </Activity>
      );
    }

    it("tømmer valg, porsjoner, avkrysninger og søk som ikke er lagret", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<Host mode="visible" recipes={recipes} />);
      await user.click(pick("Pannekaker"));
      fireEvent.change(screen.getByLabelText("Antall porsjoner for Pannekaker"), {
        target: { value: "8" },
      });
      await user.click(screen.getByRole("checkbox", { name: /egg/ }));
      await user.type(screen.getByRole("searchbox", { name: "Søk etter oppskrift" }), "pann");
      rerender(<Host mode="hidden" recipes={recipes} />);
      rerender(<Host mode="visible" recipes={recipes} />);
      expect(pick("Pannekaker")).not.toBeChecked();
      expect(screen.queryByLabelText("Antall porsjoner for Pannekaker")).not.toBeInTheDocument();
      expect(screen.getByRole("searchbox", { name: "Søk etter oppskrift" })).toHaveValue("");
      expect(screen.getByText("Velg minst én oppskrift for å lage en liste.")).toBeInTheDocument();
      await user.click(pick("Pannekaker"));
      expect(screen.getByLabelText("Antall porsjoner for Pannekaker")).toHaveValue(4);
      expect(screen.getByRole("checkbox", { name: /egg/ })).not.toBeChecked();
    });

    it("beholder uka som kom fra ukemenyen, og lagrede avkrysninger", async () => {
      const { rerender } = render(
        <Host
          mode="visible"
          recipes={recipes}
          initialSelection={{ 2: 6 }}
          weekChecks={{ initial: ["egg|"], onChange: vi.fn() }}
        />,
      );
      await userEvent.setup().click(pick("Pannekaker"));
      const again = (mode: "visible" | "hidden") => (
        <Host
          mode={mode}
          recipes={recipes}
          initialSelection={{ 2: 6 }}
          weekChecks={{ initial: ["egg|"], onChange: vi.fn() }}
        />
      );
      rerender(again("hidden"));
      rerender(again("visible"));
      expect(pick("Vafler")).toBeChecked();
      expect(pick("Pannekaker")).not.toBeChecked();
    });
  });

  describe("lagre handlelisten (Story 6.4g)", () => {
    const nameField = () => screen.getByRole("textbox", { name: "Navn på listen" });

    it("har ingen lagre-seksjon uten handling", () => {
      render(<ShoppingList recipes={recipes} />);
      expect(screen.queryByRole("button", { name: "Lagre handlelisten" })).not.toBeInTheDocument();
    });

    it("lagrer valgte oppskrifter og porsjoner under navnet, og melder fra", async () => {
      const user = userEvent.setup();
      const onSaveList = vi.fn(async () => ({ ok: true as const, id: 7, name: "Uke 46" }));
      render(<ShoppingList recipes={recipes} onSaveList={onSaveList} listName="Uke 46" />);
      expect(nameField()).toHaveValue("Uke 46");
      await user.click(pick("Pannekaker"));
      await user.click(pick("Uten antall"));
      fireEvent.change(screen.getByLabelText("Antall porsjoner for Pannekaker"), {
        target: { value: "6" },
      });
      await user.click(screen.getByRole("button", { name: "Lagre handlelisten" }));
      expect(onSaveList).toHaveBeenCalledWith({
        name: "Uke 46",
        items: [
          { recipeId: 1, servings: 6 },
          { recipeId: 3, servings: 1 },
        ],
      });
      expect(await screen.findByText("Handlelisten «Uke 46» er lagret.")).toBeInTheDocument();
    });

    it("sier fra uten valgte oppskrifter, uten å lagre", async () => {
      const user = userEvent.setup();
      const onSaveList = vi.fn();
      render(<ShoppingList recipes={recipes} onSaveList={onSaveList} listName="Uke 46" />);
      await user.click(screen.getByRole("button", { name: "Lagre handlelisten" }));
      expect(screen.getByRole("alert")).toHaveTextContent("Velg minst én oppskrift før du lagrer.");
      expect(onSaveList).not.toHaveBeenCalled();
    });

    it("viser meldingen fra handlingen under navnefeltet, og Enter i feltet lagrer", async () => {
      const user = userEvent.setup();
      const onSaveList = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, message: "Skriv et navn på listen." })
        .mockResolvedValueOnce({ ok: true, id: 1, name: "Taco" });
      render(<ShoppingList recipes={recipes} onSaveList={onSaveList} />);
      await user.click(pick("Vafler"));
      await user.click(screen.getByRole("button", { name: "Lagre handlelisten" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("Skriv et navn på listen.");
      expect(nameField()).toHaveAttribute("aria-invalid", "true");
      await user.type(nameField(), "Taco{Enter}");
      expect(onSaveList).toHaveBeenCalledTimes(2);
      expect(await screen.findByText("Handlelisten «Taco» er lagret.")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("starter på porsjonene fra en lagret liste, men ikke for oppskrift uten antall", () => {
      render(
        <ShoppingList recipes={recipes} onSaveList={vi.fn()} initialSelection={{ 2: 9, 3: 5 }} />,
      );
      expect(screen.getByLabelText("Antall porsjoner for Vafler")).toHaveValue(9);
      expect(screen.queryByLabelText("Antall porsjoner for Uten antall")).not.toBeInTheDocument();
    });
  });

  describe("handlelisten uten nett (Story 6.17)", () => {
    beforeEach(() => window.localStorage.clear());

    function stored() {
      return parseOfflineList(window.localStorage.getItem(OFFLINE_LIST_KEY));
    }

    it("lagrer varene som skal kjøpes, og avkrysningene, i nettleseren", async () => {
      const user = userEvent.setup();
      render(<ShoppingList recipes={recipes} listName="Uke 46" />);
      expect(stored()).toBeNull(); // ingenting valgt ennå
      await user.click(pick("Pannekaker"));
      expect(stored()).toMatchObject({
        title: "Uke 46",
        items: [
          { key: "egg|", text: "3 egg", from: "Pannekaker" },
          { key: "mel|g", text: "400 g mel", from: "Pannekaker" },
          { key: "melk|dl", text: "4 dl melk", from: "Pannekaker" },
        ],
        checked: [],
      });
      await user.click(screen.getByRole("checkbox", { name: /3 egg/ }));
      expect(stored()?.checked).toEqual(["egg|"]);
    });

    it("en tom liste overskriver ikke det som er lagret", async () => {
      const user = userEvent.setup();
      const { unmount } = render(<ShoppingList recipes={recipes} />);
      await user.click(pick("Vafler"));
      expect(stored()?.items).toHaveLength(2);
      unmount();
      render(<ShoppingList recipes={recipes} />);
      expect(stored()?.items).toHaveLength(2);
    });

    it("varer hjemme kommer ikke med", async () => {
      const user = userEvent.setup();
      render(<ShoppingList recipes={recipes} pantry={[{ id: 1, name: "egg" }]} />);
      await user.click(pick("Vafler"));
      expect(stored()?.items.map((item) => item.text)).toEqual(["2 dl melk"]);
    });
  });
});
