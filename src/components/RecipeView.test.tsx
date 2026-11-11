// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Recipe } from "@/domain";

const actions = vi.hoisted(() => ({
  saveRecipe: vi.fn(),
  removeRecipe: vi.fn(),
  rememberServings: vi.fn(),
  moveToFolder: vi.fn(),
  moveToNewFolder: vi.fn(),
  setFavorite: vi.fn(),
  changeOriginalServings: vi.fn(),
  requestSuggestions: vi.fn(),
  applySuggestion: vi.fn(),
  removeSuggestion: vi.fn(),
  fetchTimeFromSource: vi.fn(),
  saveNotes: vi.fn(),
  saveFitsFor: vi.fn(),
  addLabel: vi.fn(),
  saveRating: vi.fn(),
  copyRecipeToVariant: vi.fn(),
  removeLabel: vi.fn(),
  markCookedToday: vi.fn(),
}));
vi.mock("@/app/oppskrift/[id]/actions", () => actions);

const { default: RecipeView } = await import("./RecipeView");

beforeEach(() => {
  actions.saveRecipe.mockReset().mockResolvedValue({ ok: true });
  actions.removeRecipe.mockReset().mockResolvedValue(undefined);
  actions.rememberServings.mockReset().mockResolvedValue({ ok: true });
  actions.moveToFolder.mockReset().mockResolvedValue({ ok: true, folderName: null });
  actions.moveToNewFolder.mockReset().mockResolvedValue({ ok: true, folderName: "Ny" });
  actions.setFavorite.mockReset().mockResolvedValue({ ok: true });
  actions.changeOriginalServings.mockReset().mockResolvedValue({ ok: true });
  actions.applySuggestion.mockReset().mockResolvedValue({
    ok: true,
    suggestion: { id: 21, text: "Tilsett sitron.", reason: "Gir friskhet.", appliesTo: "recipe" },
  });
  actions.removeSuggestion.mockReset().mockResolvedValue({ ok: true });
  actions.requestSuggestions.mockReset().mockResolvedValue({
    ok: true,
    isExample: true,
    suggestions: [{ text: "Tilsett sitron.", reason: "Gir friskhet.", appliesTo: "recipe" }],
  });
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

afterEach(cleanup);

const folders = [
  { id: 1, name: "Hverdag" },
  { id: 2, name: "Helg" },
];

const recipe: Recipe = {
  id: 1,
  title: "Pannekaker",
  sourceUrl: null,
  sourceName: null,
  originalServings: 4,
  selectedServings: null,
  savedAt: null,
  folderId: null,
  isFavorite: false,
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
  suggestions: [],
};

describe("RecipeView", () => {
  it("viser fast format: tittel, kilde, porsjonsvelger, ingredienser og nummererte steg", () => {
    render(<RecipeView recipe={recipe} folders={folders} />);
    const title = screen.getByRole("heading", { level: 1, name: "Pannekaker" });
    const source = screen.getByText("Lagt inn selv");
    const stepper = screen.getByLabelText("Antall porsjoner");
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

  it("har en forslagsdel under ingredienser og steg, bundet til oppskriftens id (Story 4.1)", async () => {
    const user = userEvent.setup();
    render(<RecipeView recipe={{ ...recipe, id: 7 }} folders={folders} />);
    const steps = screen.getByRole("region", { name: "Slik gjør du" });
    const suggestions = screen.getByRole("region", { name: "Forslag" });
    expect(
      steps.compareDocumentPosition(suggestions) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await user.click(within(suggestions).getByRole("button", { name: "Få forslag" }));

    expect(actions.requestSuggestions).toHaveBeenCalledExactlyOnceWith(7);
    expect(await screen.findByText("Enkle forslag")).toBeInTheDocument();
    expect(screen.getByText("Tilsett sitron.")).toBeInTheDocument();
  });

  it("viser valgte forslag fra oppskriften og binder «Ta i bruk» og «Fjern» til oppskriftens id (Story 4.2)", async () => {
    const user = userEvent.setup();
    render(
      <RecipeView
        recipe={{
          ...recipe,
          id: 7,
          suggestions: [
            { id: 5, text: "Server med salat.", reason: "Gir kontrast.", appliesTo: "recipe" },
          ],
        }}
        folders={folders}
      />,
    );
    const chosen = screen.getByRole("group", { name: "Dine valgte forslag" });
    expect(within(chosen).getByText("Server med salat.")).toBeInTheDocument();
    expect(within(chosen).getByText("Tatt i bruk")).toBeInTheDocument();

    await user.click(within(chosen).getByRole("button", { name: "Fjern: Server med salat." }));
    expect(actions.removeSuggestion).toHaveBeenCalledExactlyOnceWith(7, 5);

    await user.click(screen.getByRole("button", { name: "Få forslag" }));
    await user.click(await screen.findByRole("button", { name: "Ta i bruk: Tilsett sitron." }));
    expect(actions.applySuggestion).toHaveBeenCalledExactlyOnceWith(7, {
      text: "Tilsett sitron.",
      reason: "Gir friskhet.",
      appliesTo: "recipe",
    });
    expect(screen.getByText("Tilsett sitron.")).toBeInTheDocument();
  });

  it("viser forslag som er tatt i bruk i ingrediensene og stegene, merket «Forslag» (Story 5.11, 5.12)", () => {
    render(
      <RecipeView
        recipe={{
          ...recipe,
          id: 7,
          suggestions: [
            {
              id: 5,
              text: "Ha en teskje vaniljesukker eller kardemomme i røren.",
              reason: "Duft.",
              appliesTo: "ingredients",
            },
            { id: 6, text: "Smak til med salt.", reason: "Smak.", appliesTo: "steps" },
            { id: 7, text: "Server med bær.", reason: "Friskt.", appliesTo: "recipe" },
          ],
        }}
        folders={folders}
      />,
    );
    const ingredientCard = screen
      .getByRole("heading", { name: "Ingredienser" })
      .closest("section")!;
    expect(
      within(ingredientCard).getByRole("checkbox", {
        name: /vaniljesukker eller kardemomme Forslag/,
      }),
    ).toBeInTheDocument();
    const stepCard = screen.getByRole("region", { name: "Slik gjør du" });
    expect(
      within(stepCard).getByRole("checkbox", { name: "Stek. Forslag: Smak til med salt." }),
    ).toBeInTheDocument();
    expect(
      within(stepCard).getByRole("checkbox", {
        name: "Visp sammen. Forslag: Rør inn vaniljesukker eller kardemomme.",
      }),
    ).toBeInTheDocument();
    expect(within(stepCard).getByText("Server med bær.")).toBeInTheDocument();
  });

  it("har en «Rediger»-lenke ved tittelen som peker til redigeringssiden", () => {
    render(<RecipeView recipe={{ ...recipe, id: 7 }} folders={folders} />);
    const link = screen.getByRole("link", { name: "Rediger Pannekaker" });
    expect(link).toHaveAttribute("href", "/oppskrift/7/rediger");
    const title = screen.getByRole("heading", { level: 1, name: "Pannekaker" });
    expect(title.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("article")).toContainElement(link);
  });

  it("har en «Skriv ut»-knapp ved tittelen, og skjuler det som ikke skal på papir (Story 6.6)", () => {
    render(<RecipeView recipe={{ ...recipe, id: 7 }} folders={folders} />);
    expect(screen.getByRole("button", { name: "Skriv ut Pannekaker" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Rediger Pannekaker" })).toHaveAttribute(
      "data-print",
      "hide",
    );
    expect(
      screen.getByRole("region", { name: "Forslag" }).closest('[data-print="hide"]'),
    ).not.toBeNull();
  });

  it("har «Lag egen variant» ved tittelen bare for en lagret oppskrift, og skjuler den på papir (Story 6.10)", () => {
    const { rerender } = render(
      <RecipeView recipe={{ ...recipe, savedAt: "2026-11-09T10:00:00.000Z" }} folders={folders} />,
    );
    const button = screen.getByRole("button", { name: `Lag egen variant av ${recipe.title}` });
    expect(button.closest("[data-print='hide']")).not.toBeNull();
    rerender(<RecipeView recipe={{ ...recipe, savedAt: null }} folders={folders} />);
    expect(screen.queryByRole("button", { name: /^Lag egen variant/ })).not.toBeInTheDocument();
  });

  it("skjuler steg-kortet når oppskriften ikke har steg, men viser forslagsdelen", () => {
    render(<RecipeView recipe={{ ...recipe, steps: [] }} folders={folders} />);
    expect(screen.getByRole("region", { name: "Forslag" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Slik gjør du" })).not.toBeInTheDocument();
  });

  it("viser stegene i lagret rekkefølge", () => {
    render(
      <RecipeView recipe={{ ...recipe, steps: [...recipe.steps].reverse() }} folders={folders} />,
    );
    const list = within(screen.getByRole("region", { name: "Slik gjør du" })).getByRole("list");
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["1.Visp sammen.", "2.Stek."]);
  });

  it("mangler opprinnelig antall: dialogen spør, og valget lagres med oppskriftens id (Story 2.4)", async () => {
    const user = userEvent.setup();
    render(<RecipeView recipe={{ ...recipe, originalServings: null }} folders={folders} />);
    const dialog = screen.getByRole("dialog", { name: "Hvor mange er oppskriften laget for?" });
    await user.click(within(dialog).getByRole("button", { name: "Lagre" }));
    expect(actions.changeOriginalServings).toHaveBeenCalledWith(1, 4);
    expect(await screen.findByText(/oppr\. 4/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Ingredienser" })).toBeInTheDocument();
  });

  it("viser kilden når oppskriften har sourceUrl eller sourceName", () => {
    render(
      <RecipeView
        recipe={{ ...recipe, sourceUrl: "https://www.matprat.no/oppskrifter/x/" }}
        folders={folders}
      />,
    );
    expect(screen.getByText("matprat.no")).toBeInTheDocument();
    expect(screen.queryByText(/Lagt inn selv/)).not.toBeInTheDocument();
  });

  describe("kilde som lenke (Story 2.2)", () => {
    const withUrl = (sourceUrl: string | null, sourceName: string | null = "Matprat") => (
      <RecipeView recipe={{ ...recipe, sourceUrl, sourceName }} folders={folders} />
    );

    it("viser kilden som lenke til sourceUrl som åpner i ny fane", () => {
      render(withUrl("https://www.matprat.no/oppskrifter/x/"));
      const link = screen.getByRole("link", { name: "Matprat, åpner kilden i ny fane" });
      expect(link).toHaveAttribute("href", "https://www.matprat.no/oppskrifter/x/");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link).toHaveTextContent("Matprat");
    });

    it("bruker vertsnavnet som tekst når kilden mangler navn", () => {
      render(withUrl("https://www.godt.no/x", null));
      expect(
        screen.getByRole("link", { name: "godt.no, åpner kilden i ny fane" }),
      ).toHaveTextContent("godt.no");
    });

    it("http er også en lenke", () => {
      render(withUrl("http://gammel.no/x"));
      expect(screen.getByRole("link", { name: /åpner kilden/ })).toHaveAttribute(
        "href",
        "http://gammel.no/x",
      );
    });

    it.each(["javascript:alert(1)", "data:text/html,x", "file:///etc/passwd", "ikke en url"])(
      "sourceUrl %j (manipulert rad) vises ikke som lenke",
      (sourceUrl) => {
        render(withUrl(sourceUrl));
        expect(screen.queryByRole("link", { name: /åpner kilden/ })).not.toBeInTheDocument();
        expect(document.querySelector(`a[href="${sourceUrl}"]`)).toBeNull();
        expect(screen.getByText("Matprat")).toBeInTheDocument();
      },
    );

    it("uten sourceUrl står bare teksten, uten lenke", () => {
      render(withUrl(null, null));
      expect(screen.getByText("Lagt inn selv")).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /åpner kilden/ })).not.toBeInTheDocument();
    });

    it("oppskrift uten porsjonsantall (null) krasjer ikke og viser uskalerte mengder", async () => {
      const user = userEvent.setup();
      render(
        <RecipeView
          recipe={{ ...recipe, originalServings: null, sourceUrl: "https://a.no/x" }}
          folders={folders}
        />,
      );
      await user.click(screen.getByRole("button", { name: "Avbryt" }));
      expect(screen.queryByLabelText("Antall porsjoner")).not.toBeInTheDocument();
      expect(screen.getByText("1 ½ dl")).toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/NaN|undefined/);
    });
  });

  it("nullstiller valgt antall når komponenten får en annen oppskrift", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<RecipeView recipe={recipe} folders={folders} />);
    await user.click(screen.getByRole("button", { name: "Flere porsjoner" }));
    expect(screen.getByLabelText("Antall porsjoner")).toHaveValue("5");

    rerender(
      <RecipeView
        recipe={{ ...recipe, id: 2, title: "Vafler", originalServings: 2 }}
        folders={folders}
      />,
    );
    expect(screen.getByLabelText("Antall porsjoner")).toHaveValue("2");
    expect(screen.queryByRole("button", { name: /Tilbakestill/ })).not.toBeInTheDocument();
  });

  it("nullstiller valgt antall og avkrysning når samme oppskrift er lagret på nytt (updatedAt endret)", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<RecipeView recipe={recipe} folders={folders} />);
    await user.click(screen.getByRole("button", { name: "Flere porsjoner" }));
    await user.click(screen.getByText("Stek."));
    await user.click(screen.getByText("melk"));

    rerender(
      <RecipeView
        recipe={{ ...recipe, originalServings: 2, updatedAt: "2026-11-09T11:00:00.000Z" }}
        folders={folders}
      />,
    );
    expect(screen.getByLabelText("Antall porsjoner")).toHaveValue("2");
    for (const checkbox of screen.getAllByRole("checkbox")) expect(checkbox).not.toBeChecked();
  });

  it("Lik id: ingrediens og steg med id 1 krysses av uavhengig av hverandre", async () => {
    const user = userEvent.setup();
    render(<RecipeView recipe={recipe} folders={folders} />);
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
        <RecipeView recipe={recipe} folders={folders} />
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
    const { rerender } = render(<RecipeView recipe={recipe} folders={folders} />);
    await user.click(screen.getByText("Stek."));
    rerender(<RecipeView recipe={{ ...recipe, id: 2, title: "Vafler" }} folders={folders} />);
    for (const checkbox of screen.getAllByRole("checkbox")) expect(checkbox).not.toBeChecked();
  });

  describe("lagre-linje og sist valgte antall (Story 3.2)", () => {
    const saved = { ...recipe, id: 7, savedAt: "2026-11-09T11:00:00.000Z" };

    it("ulagret oppskrift: «Lagre» nederst i artikkelen, og «Lagre» kaller saveRecipe med id", async () => {
      const user = userEvent.setup();
      render(<RecipeView recipe={{ ...recipe, id: 7 }} folders={folders} />);
      const save = screen.getByRole("button", { name: "Lagre" });
      const steps = screen.getByRole("region", { name: "Slik gjør du" });
      expect(steps.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(screen.getByRole("article")).toContainElement(save);

      await user.click(save);
      expect(actions.saveRecipe).toHaveBeenCalledExactlyOnceWith(7, undefined);
    });

    it("ulagret oppskrift: antallet valgt før «Lagre» sendes med (issue 009)", async () => {
      const user = userEvent.setup();
      render(<RecipeView recipe={{ ...recipe, id: 7 }} folders={folders} />);
      const input = screen.getByLabelText("Antall porsjoner");
      const original = Number((input as HTMLInputElement).value);
      await user.click(screen.getByRole("button", { name: "Flere porsjoner" }));
      await user.click(screen.getByRole("button", { name: "Lagre" }));
      expect(actions.saveRecipe).toHaveBeenCalledExactlyOnceWith(7, original + 1);
    });

    it("lagret oppskrift: «Slett» i stedet for «Lagre», og bekreftelse kaller removeRecipe med id", async () => {
      const user = userEvent.setup();
      render(<RecipeView recipe={saved} folders={folders} />);
      expect(screen.queryByRole("button", { name: "Lagre" })).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Slett Pannekaker" }));
      await user.click(screen.getByRole("button", { name: "Slett", description: "" }));
      expect(actions.removeRecipe).toHaveBeenCalledExactlyOnceWith(7);
    });

    it("lagret oppskrift: endret antall sendes til rememberServings med id og antall", async () => {
      const user = userEvent.setup();
      render(<RecipeView recipe={saved} folders={folders} />);
      await user.click(screen.getByRole("button", { name: "Flere porsjoner" }));
      expect(actions.rememberServings).toHaveBeenCalledExactlyOnceWith(7, 5);
    });

    it("ulagret oppskrift: endret antall gir ingen lagring", async () => {
      const user = userEvent.setup();
      render(<RecipeView recipe={{ ...recipe, id: 7 }} folders={folders} />);
      await user.click(screen.getByRole("button", { name: "Flere porsjoner" }));
      expect(screen.getByLabelText("Antall porsjoner")).toHaveValue("5");
      expect(actions.rememberServings).not.toHaveBeenCalled();
    });

    it("mappeknappen viser mappen oppskriften ligger i, og valget kaller moveToFolder med id", async () => {
      const user = userEvent.setup();
      render(<RecipeView recipe={{ ...saved, folderId: 1 }} folders={folders} />);
      await user.click(screen.getByRole("button", { name: "Hverdag, bytt mappe" }));
      const dialog = screen.getByRole("dialog", { name: "Lagre i mappe" });
      expect(within(dialog).getByRole("radio", { name: "Hverdag" })).toBeChecked();
      await user.click(within(dialog).getByRole("radio", { name: "Helg" }));
      await user.click(within(dialog).getByRole("button", { name: "Lagre" }));
      expect(actions.moveToFolder).toHaveBeenCalledExactlyOnceWith(7, 2);
    });

    it("«Ny mappe» kaller moveToNewFolder med id og navn", async () => {
      const user = userEvent.setup();
      render(<RecipeView recipe={saved} folders={folders} />);
      await user.click(screen.getByRole("button", { name: "Lagre i mappe" }));
      const dialog = screen.getByRole("dialog", { name: "Lagre i mappe" });
      await user.click(within(dialog).getByRole("radio", { name: "Ny mappe" }));
      await user.type(within(dialog).getByRole("textbox"), "Ny");
      await user.click(within(dialog).getByRole("button", { name: "Lagre" }));
      expect(actions.moveToNewFolder).toHaveBeenCalledExactlyOnceWith(7, "Ny");
    });

    it("hjertet kaller setFavorite med id og eksplisitt verdi (Story 3.4)", async () => {
      const user = userEvent.setup();
      render(<RecipeView recipe={saved} folders={folders} />);
      const heart = screen.getByRole("button", { name: "Favoritt: Pannekaker" });
      expect(heart).toHaveAttribute("aria-pressed", "false");
      await user.click(heart);
      expect(actions.setFavorite).toHaveBeenCalledExactlyOnceWith(7, true);
      expect(await screen.findByText("Lagt til i favoritter.")).toBeInTheDocument();
    });

    it("hjertet er fylt (aria-pressed) for en favoritt, og vises ikke for en ulagret oppskrift", () => {
      const { unmount } = render(
        <RecipeView recipe={{ ...saved, isFavorite: true }} folders={folders} />,
      );
      expect(screen.getByRole("button", { name: "Favoritt: Pannekaker" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      unmount();
      render(<RecipeView recipe={recipe} folders={folders} />);
      expect(screen.queryByRole("button", { name: /Favoritt/ })).not.toBeInTheDocument();
    });

    it("åpner på sist valgte antall, med mengdene skalert", () => {
      render(<RecipeView recipe={{ ...saved, selectedServings: 6 }} folders={folders} />);
      expect(screen.getByLabelText("Antall porsjoner")).toHaveValue("6");
      const ingredients = screen.getByRole("region", { name: "Ingredienser" });
      expect(within(ingredients).getAllByRole("listitem")[0]).toHaveTextContent("2 ¼ dl melk");
    });
  });
});

describe("RecipeView: tid (Story 6.2)", () => {
  it("viser tiden under tittelen og ved hjertet", () => {
    render(
      <RecipeView
        recipe={{ ...recipe, savedAt: "2026-11-09T10:00:00.000Z", totalMinutes: 45 }}
        folders={folders}
      />,
    );
    expect(screen.getAllByText("Tid: 45 min")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Hent tid fra kilden" })).not.toBeInTheDocument();
  });

  it("uten tid: «Hent tid fra kilden» for en importert oppskrift, ingenting for en egen", async () => {
    const user = userEvent.setup();
    actions.fetchTimeFromSource.mockResolvedValue({
      ok: false,
      message: "Fant ingen tid på siden. Du kan skrive den inn under «Rediger».",
    });
    const { unmount } = render(
      <RecipeView
        recipe={{ ...recipe, id: 9, sourceUrl: "https://www.matprat.no/x/", totalMinutes: null }}
        folders={folders}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Hent tid fra kilden" }));
    expect(actions.fetchTimeFromSource).toHaveBeenCalledWith(9);
    expect(await screen.findByText(/Fant ingen tid på siden/)).toBeInTheDocument();
    unmount();
    render(
      <RecipeView recipe={{ ...recipe, sourceUrl: null, totalMinutes: null }} folders={folders} />,
    );
    expect(screen.queryByRole("button", { name: "Hent tid fra kilden" })).not.toBeInTheDocument();
  });
});

describe("RecipeView: notater (Story 6.3)", () => {
  it("vises bare for lagrede oppskrifter", () => {
    const { unmount } = render(
      <RecipeView
        recipe={{ ...recipe, savedAt: "2026-11-09T10:00:00.000Z", notes: "Halv sukker." }}
        folders={folders}
      />,
    );
    expect(screen.getByLabelText("Dine notater")).toHaveValue("Halv sukker.");
    unmount();
    render(<RecipeView recipe={{ ...recipe, savedAt: null }} folders={folders} />);
    expect(screen.queryByRole("heading", { name: "Notater" })).not.toBeInTheDocument();
  });
});
