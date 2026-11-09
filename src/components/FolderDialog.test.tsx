// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FolderDialog from "./FolderDialog";

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
  { id: 1, name: "Hverdag" },
  { id: 2, name: "Helg" },
];

function setup(overrides: Partial<React.ComponentProps<typeof FolderDialog>> = {}) {
  const props = {
    open: true,
    folders,
    currentFolderId: null as number | null,
    onMove: vi.fn().mockResolvedValue({ ok: true, folderName: "Helg" }),
    onMoveToNew: vi.fn().mockResolvedValue({ ok: true, folderName: "Fest" }),
    onSaved: vi.fn(),
    onError: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
  render(<FolderDialog {...props} />);
  return props;
}

describe("FolderDialog", () => {
  it("er en navngitt dialog med en radiogruppe i en fieldset med legend", () => {
    setup();
    const dialog = screen.getByRole("dialog", { name: "Lagre i mappe" });
    const group = within(dialog).getByRole("group", { name: "Velg mappe" });
    expect(
      within(group)
        .getAllByRole("radio")
        .map((r) => r.closest("label")?.textContent),
    ).toEqual(["Ingen mappe", "Hverdag", "Helg", "Ny mappe"]);
  });

  it("er lukket og uten innhold når open er false", () => {
    setup({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { hidden: true })).not.toBeInTheDocument();
  });

  it("«Ingen mappe» er forhåndsvalgt og har startfokus når oppskriften ikke ligger i en mappe", () => {
    setup();
    expect(screen.getByRole("radio", { name: "Ingen mappe" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Ingen mappe" })).toHaveFocus();
  });

  it("nåværende mappe er forhåndsvalgt og har startfokus", () => {
    setup({ currentFolderId: 2 });
    expect(screen.getByRole("radio", { name: "Helg" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Helg" })).toHaveFocus();
  });

  it("pilene flytter valget mellom alternativene", async () => {
    const user = userEvent.setup();
    setup({ currentFolderId: 1 });
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "Helg" })).toBeChecked();
  });

  it("valg av «Ny mappe» viser feltet med fokus, og et annet valg skjuler det", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("radio", { name: "Ny mappe" }));
    expect(screen.getByRole("textbox", { name: "Navn på ny mappe" })).toHaveFocus();
    await user.click(screen.getByRole("radio", { name: "Helg" }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("lagrer en eksisterende mappe via onMove og melder navnet til onSaved", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole("radio", { name: "Helg" }));
    await user.click(screen.getByRole("button", { name: "Lagre" }));
    expect(props.onMove).toHaveBeenCalledExactlyOnceWith(2);
    await waitFor(() => expect(props.onSaved).toHaveBeenCalledExactlyOnceWith("Helg"));
  });

  it("«Ingen mappe» sender null", async () => {
    const user = userEvent.setup();
    const props = setup({
      currentFolderId: 1,
      onMove: vi.fn().mockResolvedValue({ ok: true, folderName: null }),
    });
    await user.click(screen.getByRole("radio", { name: "Ingen mappe" }));
    await user.click(screen.getByRole("button", { name: "Lagre" }));
    expect(props.onMove).toHaveBeenCalledExactlyOnceWith(null);
    await waitFor(() => expect(props.onSaved).toHaveBeenCalledExactlyOnceWith(null));
  });

  it("uendret valg: onCancel, ingen handling", async () => {
    const user = userEvent.setup();
    const props = setup({ currentFolderId: 1 });
    await user.click(screen.getByRole("button", { name: "Lagre" }));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.onMove).not.toHaveBeenCalled();
    expect(props.onSaved).not.toHaveBeenCalled();
  });

  it("ny mappe: sender navnet (også med Enter) til onMoveToNew", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole("radio", { name: "Ny mappe" }));
    await user.type(screen.getByRole("textbox"), "Fest{Enter}");
    expect(props.onMoveToNew).toHaveBeenCalledExactlyOnceWith("Fest");
    await waitFor(() => expect(props.onSaved).toHaveBeenCalledExactlyOnceWith("Fest"));
  });

  it("navnefeil: melding under feltet koblet med aria-describedby, ingen onSaved/onError", async () => {
    const user = userEvent.setup();
    const props = setup({
      onMoveToNew: vi
        .fn()
        .mockResolvedValue({ ok: false, field: "name", message: "Skriv et navn på mappen." }),
    });
    await user.click(screen.getByRole("radio", { name: "Ny mappe" }));
    await user.click(screen.getByRole("button", { name: "Lagre" }));
    const field = screen.getByRole("textbox", { name: "Navn på ny mappe" });
    await waitFor(() => expect(field).toHaveAccessibleDescription("Skriv et navn på mappen."));
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveFocus();
    expect(props.onSaved).not.toHaveBeenCalled();
    expect(props.onError).not.toHaveBeenCalled();
  });

  it("feil uten felt går til onError", async () => {
    const user = userEvent.setup();
    const props = setup({
      onMove: vi.fn().mockResolvedValue({ ok: false, message: "Vi fant ikke oppskriften." }),
    });
    await user.click(screen.getByRole("radio", { name: "Helg" }));
    await user.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() =>
      expect(props.onError).toHaveBeenCalledExactlyOnceWith("Vi fant ikke oppskriften."),
    );
  });

  it("kastet feil gir reservemelding til onError", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    const props = setup({ onMove: vi.fn().mockRejectedValue(new Error("nett")) });
    await user.click(screen.getByRole("radio", { name: "Helg" }));
    await user.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() =>
      expect(props.onError).toHaveBeenCalledWith(expect.stringContaining("Noe gikk galt.")),
    );
  });

  it("«Avbryt» kaller onCancel", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole("button", { name: "Avbryt" }));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  it("«Lagre» er deaktivert mens handlingen pågår", async () => {
    const user = userEvent.setup();
    let finish!: (v: { ok: true; folderName: string }) => void;
    const onMove = vi.fn(() => new Promise<{ ok: true; folderName: string }>((r) => (finish = r)));
    setup({ onMove });
    await user.click(screen.getByRole("radio", { name: "Helg" }));
    await user.click(screen.getByRole("button", { name: "Lagre" }));
    expect(screen.getByRole("button", { name: "Lagre" })).toBeDisabled();
    finish({ ok: true, folderName: "Helg" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Lagre" })).toBeEnabled());
  });
});
