// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseLine, type RecipeLine } from "@/domain";
import { servingsDialogMessages as m } from "@/lib/messages";
import IngredientList from "./IngredientList";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});
afterEach(cleanup);

const items: RecipeLine[] = ["400 g mel", "2 egg"].map((text, position) => ({
  ...parseLine(text),
  id: position + 1,
  position,
  section: null,
}));

const dialog = () => screen.queryByRole("dialog", { name: m.title });

describe("IngredientList: antallet oppskriften er laget for (Story 2.4)", () => {
  it("mangler antallet: dialogen åpnes, mengdene står uskalert bak, og valget lagres og skalerer", async () => {
    const user = userEvent.setup();
    const save = vi.fn().mockResolvedValue({ ok: true });
    render(
      <IngredientList
        ingredients={items}
        originalServings={null}
        onOriginalServingsChange={save}
      />,
    );
    expect(dialog()).toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "Antall porsjoner", hidden: false }),
    ).toBeInTheDocument();
    await user.click(within(dialog()!).getByRole("button", { name: "Flere porsjoner" }));
    await user.click(within(dialog()!).getByRole("button", { name: m.save }));
    expect(save).toHaveBeenCalledWith(5);
    // Dialogen lukkes, velgeren vises med «oppr. 5», og mengdene er som skrevet.
    expect(await screen.findByText(/oppr\. 5/)).toBeInTheDocument();
    expect(dialog()).toBeNull();
    expect(screen.getByText("400 g")).toBeInTheDocument();
  });

  it("«Avbryt» lar oppskriften stå uskalert, med knapp for å oppgi antallet senere", async () => {
    const user = userEvent.setup();
    render(
      <IngredientList
        ingredients={items}
        originalServings={null}
        onOriginalServingsChange={vi.fn().mockResolvedValue({ ok: true })}
      />,
    );
    await user.click(within(dialog()!).getByRole("button", { name: m.cancel }));
    expect(dialog()).toBeNull();
    expect(screen.getByText("400 g")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: m.ask }));
    expect(dialog()).toBeInTheDocument();
  });

  it("har antallet: ingen dialog, «oppr. 4 · endre» åpner dialogen med antallet valgt", async () => {
    const user = userEvent.setup();
    render(
      <IngredientList
        ingredients={items}
        originalServings={4}
        onOriginalServingsChange={vi.fn().mockResolvedValue({ ok: true })}
      />,
    );
    expect(dialog()).toBeNull();
    expect(screen.getByText(/oppr\. 4/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: m.editLabel }));
    expect(within(dialog()!).getByRole("textbox", { name: "Antall porsjoner" })).toHaveValue("4");
  });

  it("nytt opprinnelig antall regner alle mengder om fra det", async () => {
    const user = userEvent.setup();
    render(
      <IngredientList
        ingredients={items}
        originalServings={4}
        onOriginalServingsChange={vi.fn().mockResolvedValue({ ok: true })}
      />,
    );
    await user.click(screen.getByRole("button", { name: m.editLabel }));
    const box = within(dialog()!).getByRole("textbox", { name: "Antall porsjoner" });
    await user.clear(box);
    await user.type(box, "8");
    await user.click(within(dialog()!).getByRole("button", { name: m.save }));
    expect(await screen.findByText(/oppr\. 8/)).toBeInTheDocument();
    // Mengdene står som skrevet for 8 (valgt antall = nytt opprinnelig), og skalerer derfra.
    expect(screen.getByText("400 g")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Færre porsjoner" }));
    expect(screen.getByText("350 g")).toBeInTheDocument();
  });

  it("uten lagrefunksjon vises hverken dialog, «endre» eller «Oppgi antall»", () => {
    render(<IngredientList ingredients={items} originalServings={null} />);
    expect(dialog()).toBeNull();
    expect(screen.queryByRole("button", { name: m.ask })).toBeNull();
    cleanup();
    render(<IngredientList ingredients={items} originalServings={4} />);
    expect(screen.queryByRole("button", { name: m.editLabel })).toBeNull();
  });
});
