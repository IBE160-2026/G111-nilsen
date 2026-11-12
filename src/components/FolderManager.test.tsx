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
      "/oppskrifter",
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

  describe("angre sletting (Story 6.30b)", () => {
    function setupUndo(
      onUndoDelete: NonNullable<React.ComponentProps<typeof FolderManager>["onUndoDelete"]>,
    ) {
      const onDelete = vi.fn().mockResolvedValue({
        ok: true,
        restore: { name: "Hverdag", recipeIds: [4, 5, 6] },
      });
      render(
        <FolderManager
          folders={folders}
          onCreate={vi.fn()}
          onRename={vi.fn()}
          onDelete={onDelete}
          onUndoDelete={onUndoDelete}
        />,
      );
    }

    async function deleteHverdag(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole("button", { name: "Slett Hverdag" }));
      await user.click(screen.getByRole("button", { name: "Slett", description: "" }));
    }

    it("viser «Angre» etter sletting, og lager mappen på nytt med oppskriftene", async () => {
      const user = userEvent.setup();
      const onUndoDelete = vi.fn().mockResolvedValue({ ok: true, name: "Hverdag", restored: 3 });
      setupUndo(onUndoDelete);
      expect(screen.queryByRole("button", { name: /Angre/ })).not.toBeInTheDocument();
      await deleteHverdag(user);
      expect(
        await screen.findByText(/Mappen «Hverdag» er slettet\. Oppskriftene ligger fortsatt/),
      ).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Angre slettingen av Hverdag" }));
      expect(onUndoDelete).toHaveBeenCalledExactlyOnceWith("Hverdag", [4, 5, 6]);
      expect(
        await screen.findByText("Mappen «Hverdag» er gjenopprettet med 3 oppskrifter."),
      ).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Angre/ })).not.toBeInTheDocument();
    });

    it("viser meldingen og lar deg prøve igjen når navnet er tatt", async () => {
      const user = userEvent.setup();
      const onUndoDelete = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          field: "name",
          message: "Du har allerede en mappe med dette navnet.",
        })
        .mockResolvedValueOnce({ ok: true, name: "Hverdag", restored: 0 });
      setupUndo(onUndoDelete);
      await deleteHverdag(user);
      await user.click(await screen.findByRole("button", { name: /Angre/ }));
      expect(await screen.findByRole("alert")).toHaveTextContent("allerede en mappe");
      await user.click(screen.getByRole("button", { name: /Angre/ }));
      expect(await screen.findByText("Mappen «Hverdag» er gjenopprettet.")).toBeInTheDocument();
    });

    it("uten onUndoDelete vises ingen «Angre»", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByRole("button", { name: "Slett Hverdag" }));
      await user.click(screen.getByRole("button", { name: "Slett", description: "" }));
      await waitFor(() => expect(screen.getByRole("textbox", { name: "Ny mappe" })).toHaveFocus());
      expect(screen.queryByRole("button", { name: /Angre/ })).not.toBeInTheDocument();
    });
  });
});
