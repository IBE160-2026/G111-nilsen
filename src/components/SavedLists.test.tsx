// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SavedLists from "./SavedLists";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});
afterEach(cleanup);

const lists = [
  { id: 3, name: "Uke 46", recipes: 2 },
  { id: 5, name: "Fredagstaco", recipes: 1 },
];

describe("SavedLists", () => {
  it("viser hver liste med antall oppskrifter og en lenke som åpner den", () => {
    render(<SavedLists lists={lists} currentId={5} onDelete={vi.fn()} />);
    const open = screen.getByRole("link", { name: "Åpne Uke 46" });
    expect(open).toHaveAttribute("href", "/handleliste?liste=3");
    expect(open).toHaveTextContent("2 oppskrifter");
    expect(screen.getByRole("link", { name: "Åpne Fredagstaco" })).toHaveTextContent("1 oppskrift");
    expect(screen.getByRole("link", { name: "Åpne Fredagstaco" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("sier fra når ingen er lagret", () => {
    render(<SavedLists lists={[]} onDelete={vi.fn()} />);
    expect(screen.getByText("Du har ikke lagret noen handlelister ennå.")).toBeInTheDocument();
  });

  it("spør før den sletter, og fjerner listen etterpå", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn(async () => ({ ok: true as const }));
    render(<SavedLists lists={lists} onDelete={onDelete} />);
    await user.click(screen.getByRole("button", { name: "Slett Uke 46" }));
    const dialog = screen.getByRole("dialog", { name: "Slette handlelisten?" });
    expect(dialog).toHaveTextContent("«Uke 46» slettes.");
    await user.click(within(dialog).getByRole("button", { name: "Avbryt" }));
    expect(onDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Slett Uke 46" }));
    await user.click(
      within(screen.getByRole("dialog", { name: "Slette handlelisten?" })).getByRole("button", {
        name: "Slett",
      }),
    );
    expect(onDelete).toHaveBeenCalledWith(3);
    expect(await screen.findByText("Handlelisten «Uke 46» er slettet.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Åpne Uke 46" })).not.toBeInTheDocument();
  });

  it("beholder listen og viser meldingen når slettingen feiler", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn(async () => ({ ok: false as const, message: "Noe gikk galt." }));
    render(<SavedLists lists={lists} onDelete={onDelete} />);
    await user.click(screen.getByRole("button", { name: "Slett Uke 46" }));
    await user.click(
      within(screen.getByRole("dialog", { name: "Slette handlelisten?" })).getByRole("button", {
        name: "Slett",
      }),
    );
    expect(await screen.findByText("Noe gikk galt.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Åpne Uke 46" })).toBeInTheDocument();
  });
});
