// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FolderManager from "./FolderManager";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});
afterEach(cleanup);

const folders = [
  { id: 1, name: "Helg", recipeCount: 0 },
  { id: 2, name: "Hverdag", recipeCount: 3 },
];

function setup(list = folders) {
  const actions = {
    onCreate: vi.fn().mockResolvedValue({ ok: true, id: 9 }),
    onRename: vi.fn().mockResolvedValue({ ok: true }),
    onDelete: vi.fn().mockResolvedValue({ ok: true }),
  };
  render(<FolderManager folders={list} {...actions} />);
  return actions;
}

describe("FolderManager", () => {
  it("uten mapper: skjemaet og tom-tilstanden med «Gå til oppskriftene»", () => {
    setup([]);
    expect(screen.getByRole("textbox", { name: "Ny mappe" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Du har ingen mapper ennå." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gå til oppskriftene" })).toHaveAttribute(
      "href",
      "/samlingen",
    );
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("med mapper: en liste med en rad per mappe og ingen tom-tilstand", () => {
    setup();
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(
      screen.queryByRole("heading", { name: "Du har ingen mapper ennå." }),
    ).not.toBeInTheDocument();
  });

  it("oppretter en mappe, tømmer feltet", async () => {
    const user = userEvent.setup();
    const { onCreate } = setup();
    const field = screen.getByRole("textbox", { name: "Ny mappe" });
    await user.type(field, "Fest");
    await user.click(screen.getByRole("button", { name: "Opprett mappe" }));
    expect(onCreate).toHaveBeenCalledExactlyOnceWith("Fest");
    await waitFor(() => expect(field).toHaveValue(""));
  });

  it("opptatt navn: melding under feltet, feltet beholder teksten", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue({
      ok: false,
      field: "name",
      message: "Du har allerede en mappe med dette navnet.",
    });
    render(
      <FolderManager folders={folders} onCreate={onCreate} onRename={vi.fn()} onDelete={vi.fn()} />,
    );
    const field = screen.getByRole("textbox", { name: "Ny mappe" });
    await user.type(field, "hverdag");
    await user.click(screen.getByRole("button", { name: "Opprett mappe" }));
    await screen.findByText("Du har allerede en mappe med dette navnet.");
    expect(field).toHaveValue("hverdag");
    expect(field).toHaveFocus();
    expect(field).toHaveAttribute("aria-invalid", "true");
  });

  it("etter sletting flyttes fokus til feltet «Ny mappe»", async () => {
    const user = userEvent.setup();
    const { onDelete } = setup();
    await user.click(screen.getByRole("button", { name: "Slett Hverdag" }));
    await user.click(screen.getByRole("button", { name: "Slett", description: "" }));
    expect(onDelete).toHaveBeenCalledExactlyOnceWith(2);
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Ny mappe" })).toHaveFocus());
  });

  it("omdøping går via raden til onRename", async () => {
    const user = userEvent.setup();
    const { onRename } = setup();
    await user.click(screen.getByRole("button", { name: "Gi nytt navn til Helg" }));
    const field = screen.getByRole("textbox", { name: "Nytt navn" });
    await user.clear(field);
    await user.type(field, "Fest{Enter}");
    expect(onRename).toHaveBeenCalledExactlyOnceWith(1, "Fest");
  });
});
