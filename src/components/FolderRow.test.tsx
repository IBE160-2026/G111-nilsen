// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FolderRow from "./FolderRow";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function setup(overrides: Partial<React.ComponentProps<typeof FolderRow>> = {}, recipeCount = 3) {
  const onRename = vi.fn().mockResolvedValue({ ok: true });
  const onDelete = vi.fn().mockResolvedValue({ ok: true });
  render(
    <ul>
      <FolderRow
        folder={{ id: 4, name: "Hverdag", recipeCount }}
        onRename={onRename}
        onDelete={onDelete}
        {...overrides}
      />
    </ul>,
  );
  return { onRename, onDelete };
}

describe("FolderRow", () => {
  it.each([
    [0, "Ingen oppskrifter"],
    [1, "1 oppskrift"],
    [3, "3 oppskrifter"],
  ])("lenken til mappen viser navn og antall (%s)", (count, label) => {
    setup({}, count);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/mapper/4");
    expect(link).toHaveAccessibleName(`Hverdag ${label}`);
  });

  it("knappene har aria-label som nevner mappenavnet og tekst som er en del av navnet", () => {
    setup();
    expect(screen.getByRole("button", { name: "Gi nytt navn til Hverdag" })).toHaveTextContent(
      "Gi nytt navn",
    );
    expect(screen.getByRole("button", { name: "Slett Hverdag" })).toHaveTextContent("Slett");
  });

  it("«Gi nytt navn» bytter til skjema med navnet, og fokus går til feltet", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Gi nytt navn til Hverdag" }));
    const field = screen.getByRole("textbox", { name: "Nytt navn" });
    expect(field).toHaveValue("Hverdag");
    expect(field).toHaveFocus();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lagre nytt navn for Hverdag" })).toBeInTheDocument();
  });

  it("lagring kaller onRename med id og navn, lukker skjemaet og flytter fokus til «Gi nytt navn»", async () => {
    const user = userEvent.setup();
    const { onRename } = setup();
    await user.click(screen.getByRole("button", { name: "Gi nytt navn til Hverdag" }));
    const field = screen.getByRole("textbox", { name: "Nytt navn" });
    await user.clear(field);
    await user.type(field, "Hverdagsmat");
    await user.click(screen.getByRole("button", { name: "Lagre nytt navn for Hverdag" }));
    expect(onRename).toHaveBeenCalledExactlyOnceWith(4, "Hverdagsmat");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Gi nytt navn til Hverdag" })).toHaveFocus(),
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("feil ved omdøping: melding under feltet, skjemaet blir åpent", async () => {
    const user = userEvent.setup();
    const onRename = vi.fn().mockResolvedValue({
      ok: false,
      field: "name",
      message: "Du har allerede en mappe med dette navnet.",
    });
    setup({ onRename });
    await user.click(screen.getByRole("button", { name: "Gi nytt navn til Hverdag" }));
    await user.click(screen.getByRole("button", { name: "Lagre nytt navn for Hverdag" }));
    const field = await screen.findByRole("textbox", { name: "Nytt navn" });
    await waitFor(() =>
      expect(field).toHaveAccessibleDescription("Du har allerede en mappe med dette navnet."),
    );
    expect(field).toHaveFocus();
  });

  it("«Avbryt» og Escape lukker skjemaet uten å lagre, og fokus går tilbake til «Gi nytt navn»", async () => {
    const user = userEvent.setup();
    const { onRename } = setup();
    await user.click(screen.getByRole("button", { name: "Gi nytt navn til Hverdag" }));
    await user.click(screen.getByRole("button", { name: "Avbryt nytt navn for Hverdag" }));
    expect(screen.getByRole("button", { name: "Gi nytt navn til Hverdag" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Gi nytt navn til Hverdag" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gi nytt navn til Hverdag" })).toHaveFocus();
    expect(onRename).not.toHaveBeenCalled();
  });

  it("«Slett» åpner «Slette mappen?» med tekst om at oppskriftene blir liggende, startfokus «Avbryt»", async () => {
    const user = userEvent.setup();
    const { onDelete } = setup();
    await user.click(screen.getByRole("button", { name: "Slett Hverdag" }));
    const dialog = screen.getByRole("dialog", { name: "Slette mappen?" });
    expect(dialog).toHaveAccessibleDescription(
      /«Hverdag» slettes\. Oppskriftene i mappen blir liggende i Oppskrifter, uten mappe\./,
    );
    expect(within(dialog).getByRole("button", { name: "Avbryt" })).toHaveFocus();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("«Avbryt» ingenting endres og fokus tilbake til «Slett»", async () => {
    const user = userEvent.setup();
    const { onDelete } = setup();
    const trigger = screen.getByRole("button", { name: "Slett Hverdag" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Avbryt" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("bekreftelse kaller onDelete med id, lukker dialogen og kaller onDeleted", async () => {
    const user = userEvent.setup();
    const onDeleted = vi.fn();
    const { onDelete } = setup({ onDeleted });
    await user.click(screen.getByRole("button", { name: "Slett Hverdag" }));
    await user.click(screen.getByRole("button", { name: "Slett", description: "" }));
    expect(onDelete).toHaveBeenCalledExactlyOnceWith(4);
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("feil ved sletting: dialogen lukkes og meldingen vises i raden", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue({ ok: false, message: "Vi fant ikke oppskriften." });
    const onDeleted = vi.fn();
    setup({ onDelete, onDeleted });
    await user.click(screen.getByRole("button", { name: "Slett Hverdag" }));
    await user.click(screen.getByRole("button", { name: "Slett", description: "" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Vi fant ikke oppskriften.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it("kastet feil ved sletting gir reservemelding", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    setup({ onDelete: vi.fn().mockRejectedValue(new Error("nett")) });
    await user.click(screen.getByRole("button", { name: "Slett Hverdag" }));
    await user.click(screen.getByRole("button", { name: "Slett", description: "" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Noe gikk galt.");
  });
});
