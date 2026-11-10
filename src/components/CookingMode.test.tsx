// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseLine, type RecipeLine, type Step } from "@/domain";
import CookingMode from "./CookingMode";
import IngredientList from "./IngredientList";
import { SelectedServingsProvider } from "./SelectedServings";

const showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
});
const close = vi.fn(function (this: HTMLDialogElement) {
  this.removeAttribute("open");
});
const release = vi.fn(() => Promise.resolve());
const request = vi.fn(() => Promise.resolve({ release }));

beforeEach(() => {
  showModal.mockClear();
  close.mockClear();
  release.mockClear();
  request.mockClear();
  HTMLDialogElement.prototype.showModal = showModal;
  HTMLDialogElement.prototype.close = close;
  Object.defineProperty(navigator, "wakeLock", { value: { request }, configurable: true });
});
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(navigator, "wakeLock");
});

const steps: Step[] = [
  { id: 1, position: 1, section: null, text: "Visp sammen mel og melk." },
  { id: 2, position: 2, section: null, text: "Stek i panne." },
  { id: 3, position: 3, section: null, text: "Server varmt." },
];
const ingredients: RecipeLine[] = ["400 g mel", "2 egg"].map((text, i) => ({
  ...parseLine(text),
  id: i + 1,
  position: i + 1,
  section: null,
}));

function renderCooking(props: Partial<React.ComponentProps<typeof CookingMode>> = {}) {
  return render(
    <CookingMode
      title="Pannekaker"
      steps={steps}
      ingredients={ingredients}
      originalServings={4}
      selectedServings={null}
      {...props}
    />,
  );
}
const openButton = () => screen.getByRole("button", { name: "Åpne kokemodus: Pannekaker" });
const dialog = () => screen.getByRole("dialog", { name: "Kokemodus: Pannekaker", hidden: true });

describe("CookingMode", () => {
  it("har ingen knapp når oppskriften ikke har steg", () => {
    renderCooking({ steps: [] });
    expect(screen.queryByRole("button", { name: /kokemodus/i })).not.toBeInTheDocument();
  });

  it("åpner med showModal, viser steg 1 av 3 og holder skjermen våken", async () => {
    const user = userEvent.setup();
    renderCooking();
    await user.click(openButton());
    expect(showModal).toHaveBeenCalledTimes(1);
    const d = within(dialog());
    expect(d.getByText("Steg 1 av 3")).toBeInTheDocument();
    expect(d.getByText("Visp sammen mel og melk.")).toBeInTheDocument();
    expect(request).toHaveBeenCalledWith("screen");
  });

  it("Neste og Forrige bytter steg, Forrige er deaktivert på første, og siste heter Ferdig", async () => {
    const user = userEvent.setup();
    renderCooking();
    await user.click(openButton());
    const d = within(dialog());
    expect(d.getByRole("button", { name: "Forrige" })).toHaveAttribute("aria-disabled", "true");
    await user.click(d.getByRole("button", { name: "Forrige" }));
    expect(d.getByText("Steg 1 av 3")).toBeInTheDocument();
    await user.click(d.getByRole("button", { name: "Neste" }));
    expect(d.getByText("Stek i panne.")).toBeInTheDocument();
    await user.click(d.getByRole("button", { name: "Neste" }));
    expect(d.getByText("Server varmt.")).toBeInTheDocument();
    await user.click(d.getByRole("button", { name: "Forrige" }));
    expect(d.getByText("Steg 2 av 3")).toBeInTheDocument();
    await user.click(d.getByRole("button", { name: "Neste" }));
    await user.click(d.getByRole("button", { name: "Ferdig" }));
    expect(close).toHaveBeenCalled();
    expect(openButton()).toHaveFocus();
  });

  it("piltastene bytter steg", async () => {
    const user = userEvent.setup();
    renderCooking();
    await user.click(openButton());
    const d = within(dialog());
    await user.keyboard("{ArrowRight}");
    expect(d.getByText("Steg 2 av 3")).toBeInTheDocument();
    await user.keyboard("{ArrowLeft}");
    expect(d.getByText("Steg 1 av 3")).toBeInTheDocument();
    await user.keyboard("{ArrowLeft}");
    expect(d.getByText("Steg 1 av 3")).toBeInTheDocument();
  });

  it("Avslutt og Escape lukker og gir fokus tilbake; steget starter på 1 neste gang", async () => {
    const user = userEvent.setup();
    renderCooking();
    await user.click(openButton());
    await user.click(within(dialog()).getByRole("button", { name: "Neste" }));
    await user.click(within(dialog()).getByRole("button", { name: "Avslutt kokemodus" }));
    expect(openButton()).toHaveFocus();
    expect(release).toHaveBeenCalled();
    await user.click(openButton());
    expect(within(dialog()).getByText("Steg 1 av 3")).toBeInTheDocument();
    dialog().dispatchEvent(new Event("cancel", { cancelable: true }));
    await vi.waitFor(() => expect(openButton()).toHaveFocus());
  });

  it("ingrediensene er skalert til lagret valgt antall", async () => {
    const user = userEvent.setup();
    renderCooking({ selectedServings: 8 });
    await user.click(openButton());
    const d = within(dialog());
    expect(d.getByText("Ingredienser for 8 personer")).toBeInTheDocument();
    expect(d.getByText("800 g mel")).toBeInTheDocument();
    expect(d.getByText("4 egg")).toBeInTheDocument();
  });

  it("bruker antallet som er valgt på siden akkurat nå, også halve", async () => {
    const user = userEvent.setup();
    render(
      <SelectedServingsProvider>
        <IngredientList ingredients={ingredients} originalServings={4} />
        <CookingMode
          title="Pannekaker"
          steps={steps}
          ingredients={ingredients}
          originalServings={4}
          selectedServings={null}
        />
      </SelectedServingsProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Legg til en halv porsjon" }));
    await user.click(openButton());
    const d = within(dialog());
    expect(d.getByText("Ingredienser for 4,5 personer")).toBeInTheDocument();
    expect(d.getByText("450 g mel")).toBeInTheDocument();
  });

  it("uten gyldig opprinnelig antall vises uskalerte mengder uten antall", async () => {
    const user = userEvent.setup();
    renderCooking({ originalServings: null, selectedServings: 8 });
    await user.click(openButton());
    const d = within(dialog());
    expect(d.getByText("Ingredienser")).toBeInTheDocument();
    expect(d.getByText("400 g mel")).toBeInTheDocument();
  });

  it("virker uten Wake Lock, og når Wake Lock avvises", async () => {
    const user = userEvent.setup();
    Reflect.deleteProperty(navigator, "wakeLock");
    renderCooking();
    await user.click(openButton());
    expect(within(dialog()).getByText("Steg 1 av 3")).toBeInTheDocument();
    cleanup();

    Object.defineProperty(navigator, "wakeLock", {
      value: { request: vi.fn(() => Promise.reject(new Error("NotAllowedError"))) },
      configurable: true,
    });
    renderCooking();
    await user.click(openButton());
    expect(within(dialog()).getByText("Steg 1 av 3")).toBeInTheDocument();
  });

  it("stegene sorteres på posisjon", async () => {
    const user = userEvent.setup();
    renderCooking({ steps: [steps[1], steps[0]] });
    await user.click(openButton());
    expect(within(dialog()).getByText("Visp sammen mel og melk.")).toBeInTheDocument();
  });

  it("følger metriske mål valgt på siden", async () => {
    const user = userEvent.setup();
    const us: RecipeLine[] = ["2 cups flour", "1 tbsp salt"].map((text, i) => ({
      ...parseLine(text),
      id: i + 1,
      position: i + 1,
      section: null,
    }));
    render(
      <SelectedServingsProvider>
        <IngredientList ingredients={us} originalServings={4} />
        <CookingMode
          title="Pannekaker"
          steps={steps}
          ingredients={us}
          originalServings={4}
          selectedServings={null}
        />
      </SelectedServingsProvider>,
    );
    await user.click(openButton());
    expect(within(dialog()).getByText("2 cup flour")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    dialog().dispatchEvent(new Event("cancel", { cancelable: true }));
    await user.click(screen.getByLabelText(/Vis i metriske mål/));
    await user.click(openButton());
    expect(within(dialog()).getByText("4,8 dl flour (ca.)")).toBeInTheDocument();
    expect(within(dialog()).getByText("1 ss salt")).toBeInTheDocument();
  });
});
