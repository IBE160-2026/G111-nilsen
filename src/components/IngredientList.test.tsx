// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseLine, type RecipeLine } from "@/domain";
import { servingStepperMessages } from "@/lib/messages";
import IngredientList, { groupBySection } from "./IngredientList";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function lines(...specs: (string | [string, string | null])[]): RecipeLine[] {
  return specs.map((spec, position) => {
    const [text, section] = typeof spec === "string" ? [spec, null] : spec;
    return { ...parseLine(text), id: position + 1, position, section };
  });
}

const basic = lines("400 g mel", "1 egg", "salt og pepper");

const field = () => screen.getByLabelText("Antall personer");
const plus = () => screen.getByRole("button", { name: "Flere personer" });
const minus = () => screen.getByRole("button", { name: "Færre personer" });
const shown = () =>
  within(screen.getByRole("region", { name: "Ingredienser" }))
    .getAllByRole("listitem")
    .map((li) => li.textContent);

describe("IngredientList", () => {
  it("Åpne: viser opprinnelig antall og mengder som originalen, uten «Tilbakestill»", () => {
    render(<IngredientList ingredients={basic} originalServings={4} />);
    expect(field()).toHaveValue("4");
    expect(shown()).toEqual(["400 g mel", "1 egg", "salt og pepper"]);
    expect(screen.queryByRole("button", { name: /Tilbakestill/ })).not.toBeInTheDocument();
  });

  it("Pluss: 5 personer skalerer mengdene, merker «ca.» og lar utolkbare linjer stå", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    render(<IngredientList ingredients={basic} originalServings={4} />);
    await user.click(plus());

    expect(field()).toHaveValue("5");
    expect(shown()).toEqual(["500 g mel", "1 egg ca.", "salt og pepper"]);
    expect(screen.getByText("ca.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("5 personer");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("utolkbare linjer vises i kursiv-stilen og er uendret ved alle antall", async () => {
    const user = userEvent.setup();
    render(<IngredientList ingredients={basic} originalServings={4} />);
    const unparsed = () => screen.getByText("salt og pepper");
    expect(unparsed()).toHaveClass("unparsed");
    for (const value of ["1", "17", "50"]) {
      await user.clear(field());
      await user.type(field(), `${value}{Enter}`);
      expect(unparsed()).toHaveTextContent(/^salt og pepper$/);
    }
  });

  it("Minus til grense: fra 2 gir to trykk 1 og deaktivert −", async () => {
    const user = userEvent.setup();
    render(<IngredientList ingredients={lines("400 g mel")} originalServings={2} />);
    await user.click(minus());
    expect(field()).toHaveValue("1");
    expect(minus()).toBeDisabled();
    expect(shown()).toEqual(["200 g mel"]);
  });

  it("Skriv gyldig: 8 og forlat feltet gir mengder for 8 og «Tilbakestill til 4»", async () => {
    const user = userEvent.setup();
    render(<IngredientList ingredients={basic} originalServings={4} />);
    await user.clear(field());
    await user.type(field(), "8");
    await user.tab();
    expect(shown()).toEqual(["800 g mel", "2 egg", "salt og pepper"]);
    expect(screen.getByRole("button", { name: "Tilbakestill til 4" })).toBeInTheDocument();
  });

  it.each(["0", "51", "2,5", "", "abc"])(
    "Skriv ugyldig «%s»: melding, og antall og mengder fra forrige gyldige verdi",
    async (text) => {
      const user = userEvent.setup();
      render(<IngredientList ingredients={basic} originalServings={4} />);
      await user.click(plus());
      await user.clear(field());
      if (text) await user.type(field(), text);
      await user.tab();

      expect(screen.getByText(servingStepperMessages.invalid)).toBeInTheDocument();
      expect(field()).toHaveValue("5");
      expect(shown()).toEqual(["500 g mel", "1 egg ca.", "salt og pepper"]);
    },
  );

  it("Tilbakestill: fra 8 tilbake til 4, knappen forsvinner og mengdene er som originalen", async () => {
    const user = userEvent.setup();
    render(<IngredientList ingredients={basic} originalServings={4} />);
    await user.clear(field());
    await user.type(field(), "8{Enter}");
    await user.click(screen.getByRole("button", { name: "Tilbakestill til 4" }));
    expect(field()).toHaveValue("4");
    expect(screen.queryByRole("button", { name: /Tilbakestill/ })).not.toBeInTheDocument();
    expect(shown()).toEqual(["400 g mel", "1 egg", "salt og pepper"]);
  });

  it("Ingen porsjoner: uten opprinnelig antall vises ingen porsjonsvelger og mengdene uskalert", () => {
    render(<IngredientList ingredients={basic} originalServings={null} />);
    expect(screen.queryByLabelText("Antall personer")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /personer/ })).not.toBeInTheDocument();
    expect(shown()).toEqual(["400 g mel", "1 egg", "salt og pepper"]);
  });

  it("Seksjoner: linjer uten seksjon først, så hver seksjon med etikett, i lagret rekkefølge", () => {
    const sectioned = lines(
      ["2 dl fløte", "Saus"],
      "400 g pasta",
      ["1 ts salt", "Saus"],
      ["50 g parmesan", "Topping"],
      "1 l vann",
    );
    render(<IngredientList ingredients={sectioned} originalServings={4} />);

    const card = screen.getByRole("region", { name: "Ingredienser" });
    const label = within(card).getByRole("heading", { level: 3, name: "Saus" });
    expect(label).toHaveClass("sectionLabel");
    expect(
      within(card)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(["Saus", "Topping"]);

    const lists = within(card).getAllByRole("list");
    const texts = lists.map((list) =>
      within(list)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    );
    expect(texts).toEqual([
      ["400 g pasta", "1 l vann"],
      ["2 dl fløte", "1 ts salt"],
      ["50 g parmesan"],
    ]);
    expect(lists[1]).toHaveAccessibleName("Saus");
  });

  it("mengdene regnes alltid fra originalen, også etter mange endringer", async () => {
    const user = userEvent.setup();
    const original = lines("750 g potet", "1 egg", "½ ts salt");
    const snapshot = structuredClone(original);
    render(<IngredientList ingredients={original} originalServings={4} />);

    await user.clear(field());
    await user.type(field(), "3{Enter}");
    expect(shown()).toEqual(["560 g potet", "1 egg ca.", "0,4 ts salt"]);

    for (let i = 0; i < 7; i++) await user.click(minus()); // ned til 1
    await user.clear(field());
    await user.type(field(), "50{Enter}");
    await user.clear(field());
    await user.type(field(), "3{Enter}");
    expect(shown()).toEqual(["560 g potet", "1 egg ca.", "0,4 ts salt"]);

    await user.click(screen.getByRole("button", { name: "Tilbakestill til 4" }));
    expect(shown()).toEqual(["750 g potet", "1 egg", "½ ts salt"]);
    expect(original).toEqual(snapshot);
  });

  it("groupBySection sorterer på posisjon og behandler tom seksjon som ingen seksjon", () => {
    const unordered: RecipeLine[] = [
      { ...parseLine("b"), id: 2, position: 1, section: "  " },
      { ...parseLine("a"), id: 1, position: 0, section: null },
      { ...parseLine("c"), id: 3, position: 2, section: "Saus" },
    ];
    expect(
      groupBySection(unordered).map((g) => [g.section, g.lines.map((l) => l.original)]),
    ).toEqual([
      [null, ["a", "b"]],
      ["Saus", ["c"]],
    ]);
  });

  it.each([0, 60, -2, 2.5])(
    "ugyldig opprinnelig antall %s behandles som manglende: ingen velger, uskalerte mengder",
    (original) => {
      render(<IngredientList ingredients={basic} originalServings={original} />);
      expect(screen.queryByLabelText("Antall personer")).not.toBeInTheDocument();
      expect(shown()).toEqual(["400 g mel", "1 egg", "salt og pepper"]);
    },
  );
});
