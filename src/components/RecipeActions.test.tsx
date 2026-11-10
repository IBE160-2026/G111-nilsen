// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RecipeActions from "./RecipeActions";
import { SelectedServingsProvider, useReportSelectedServings } from "./SelectedServings";

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
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const status = () => screen.getByRole("status");

const folderProps = {
  folders: [],
  folderId: null,
  onMoveToFolder: vi.fn(),
  onMoveToNewFolder: vi.fn(),
  isFavorite: false,
  onSetFavorite: vi.fn().mockResolvedValue({ ok: true }),
};

function setup(overrides: Partial<React.ComponentProps<typeof RecipeActions>> = {}) {
  const onSave = vi.fn().mockResolvedValue({ ok: true });
  const onDelete = vi.fn().mockResolvedValue(undefined);
  const view = render(
    <RecipeActions
      title="Pannekaker"
      saved={false}
      onSave={onSave}
      onDelete={onDelete}
      {...folderProps}
      {...overrides}
    />,
  );
  return { onSave, onDelete, ...view };
}

describe("RecipeActions: ikke lagret", () => {
  it("viser «Lagre» og ingen «Slett», med tomt statusområde i DOM", () => {
    setup();
    expect(screen.getByRole("button", { name: "Lagre" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /Slett/ })).not.toBeInTheDocument();
    expect(status()).toBeEmptyDOMElement();
  });

  it("«Lagre» kaller onSave; under lagring er knappen deaktivert og viser «Lagrer …»", async () => {
    const user = userEvent.setup();
    let finish!: (value: { ok: true }) => void;
    const onSave = vi.fn(() => new Promise<{ ok: true }>((resolve) => (finish = resolve)));
    setup({ onSave });
    await user.click(screen.getByRole("button", { name: "Lagre" }));
    const pending = screen.getByRole("button", { name: "Lagrer …" });
    expect(pending).toBeDisabled();
    await user.click(pending);
    expect(onSave).toHaveBeenCalledTimes(1);

    await act(async () => finish({ ok: true }));
    expect(screen.getByRole("button", { name: "Lagre" })).toBeEnabled();
  });

  it("fokus flyttes til «Slett» når siden blir lagret etter «Lagre»", async () => {
    const user = userEvent.setup();
    const { rerender, onSave, onDelete } = setup();
    await user.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    rerender(
      <RecipeActions
        title="Pannekaker"
        saved
        onSave={onSave}
        onDelete={onDelete}
        {...folderProps}
      />,
    );
    expect(screen.getByRole("button", { name: "Slett Pannekaker" })).toHaveFocus();
  });

  it("fokus går tilbake til «Lagre» når lagringen feiler", async () => {
    const user = userEvent.setup();
    setup({ onSave: vi.fn().mockResolvedValue({ ok: false, message: "Noe gikk galt." }) });
    await user.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => expect(status()).toHaveTextContent("Noe gikk galt."));
    expect(screen.getByRole("button", { name: "Lagre" })).toHaveFocus();
  });

  it("viser «Lagret.» i statusområdet i 3 sekunder, deretter tomt", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    setup();
    await user.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => expect(status()).toHaveTextContent("Lagret."));

    act(() => vi.advanceTimersByTime(2900));
    expect(status()).toHaveTextContent("Lagret.");
    act(() => vi.advanceTimersByTime(200));
    expect(status()).toBeEmptyDOMElement();
  });

  it("nullstiller tidtakeren ved ny lagring", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { rerender, onSave, onDelete } = setup();
    await user.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => expect(status()).toHaveTextContent("Lagret."));
    act(() => vi.advanceTimersByTime(2000));

    // Ny lagring (for eksempel etter at siden ble gjenopprettet) starter 3 sekunder på nytt.
    await user.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    act(() => vi.advanceTimersByTime(2000));
    expect(status()).toHaveTextContent("Lagret.");
    act(() => vi.advanceTimersByTime(1100));
    expect(status()).toBeEmptyDOMElement();
    rerender(
      <RecipeActions
        title="Pannekaker"
        saved={false}
        onSave={onSave}
        onDelete={onDelete}
        {...folderProps}
      />,
    );
  });

  it("«Lagret.» står igjen og «Slett» kommer når siden oppdateres til lagret", async () => {
    const user = userEvent.setup();
    const { rerender, onSave, onDelete } = setup();
    await user.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => expect(status()).toHaveTextContent("Lagret."));
    rerender(
      <RecipeActions
        title="Pannekaker"
        saved
        onSave={onSave}
        onDelete={onDelete}
        {...folderProps}
      />,
    );
    expect(screen.getByRole("button", { name: "Slett Pannekaker" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lagre" })).not.toBeInTheDocument();
    expect(status()).toHaveTextContent("Lagret.");
  });

  it("ryddes ved avmontering: ingen tidtaker står igjen", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { unmount } = setup();
    await user.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => expect(status()).toHaveTextContent("Lagret."));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("feil: meldingen vises uten tidsbegrensning, og knappen kan trykkes på nytt", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSave = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, message: "Vi fant ikke oppskriften. Prøv igjen." })
      .mockResolvedValue({ ok: true });
    setup({ onSave });
    await user.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() =>
      expect(status()).toHaveTextContent("Vi fant ikke oppskriften. Prøv igjen."),
    );
    act(() => vi.advanceTimersByTime(10_000));
    expect(status()).toHaveTextContent("Vi fant ikke oppskriften.");

    await user.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => expect(status()).toHaveTextContent("Lagret."));
  });

  it("kastet feil (for eksempel nettverket): reservemelding og knappen kan trykkes på nytt", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    setup({ onSave: vi.fn().mockRejectedValue(new Error("nett")) });
    await user.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => expect(status()).toHaveTextContent("Noe gikk galt."));
    expect(screen.getByRole("button", { name: "Lagre" })).toBeEnabled();
  });
});

describe("RecipeActions: lagret", () => {
  it("viser «Lagre i mappe» (uten mappe) ved siden av «Slett»", () => {
    setup({ saved: true });
    const button = screen.getByRole("button", { name: "Lagre i mappe" });
    expect(button).toHaveTextContent("Lagre i mappe");
    expect(button).toHaveAttribute("aria-haspopup", "dialog");
  });

  it("viser «Slett» med aria-label som nevner tittelen, og ingen «Lagre»", () => {
    setup({ saved: true });
    const button = screen.getByRole("button", { name: "Slett Pannekaker" });
    expect(button).toHaveTextContent("Slett");
    expect(screen.queryByRole("button", { name: "Lagre" })).not.toBeInTheDocument();
    expect(status()).toBeEmptyDOMElement();
  });

  it("«Slett» åpner dialogen med tittel og tekst, og startfokus er «Avbryt»", async () => {
    const user = userEvent.setup();
    const { onDelete } = setup({ saved: true });
    await user.click(screen.getByRole("button", { name: "Slett Pannekaker" }));
    const dialog = screen.getByRole("dialog", { name: "Slette oppskriften?" });
    expect(dialog).toHaveAccessibleDescription(
      "«Pannekaker» fjernes fra oppskriftene dine. Du kan ikke angre.",
    );
    expect(screen.getByRole("button", { name: "Avbryt" })).toHaveFocus();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("«Avbryt» lukker dialogen uten å slette, og fokus går tilbake til «Slett»", async () => {
    const user = userEvent.setup();
    const { onDelete } = setup({ saved: true });
    const trigger = screen.getByRole("button", { name: "Slett Pannekaker" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Avbryt" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it("bekreftelse kaller onDelete; «Slett» i dialogen er deaktivert mens det pågår", async () => {
    const user = userEvent.setup();
    let finish!: () => void;
    const onDelete = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    setup({ saved: true, onDelete });
    await user.click(screen.getByRole("button", { name: "Slett Pannekaker" }));
    const confirm = screen.getByRole("button", { name: "Slett", description: "" });
    await user.click(confirm);
    expect(onDelete).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(confirm).toBeDisabled());
    await user.click(confirm);
    expect(onDelete).toHaveBeenCalledTimes(1);
    await act(async () => finish());
  });

  it("feil ved sletting: dialogen lukkes og meldingen vises i statusområdet", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue({ ok: false, message: "Vi fant ikke oppskriften." });
    setup({ saved: true, onDelete });
    await user.click(screen.getByRole("button", { name: "Slett Pannekaker" }));
    await user.click(screen.getByRole("button", { name: "Slett", description: "" }));
    await waitFor(() => expect(status()).toHaveTextContent("Vi fant ikke oppskriften."));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Slett Pannekaker" })).toBeInTheDocument();
  });

  it("kastet feil ved sletting gir reservemelding", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    setup({ saved: true, onDelete: vi.fn().mockRejectedValue(new Error("nett")) });
    await user.click(screen.getByRole("button", { name: "Slett Pannekaker" }));
    await user.click(screen.getByRole("button", { name: "Slett", description: "" }));
    await waitFor(() => expect(status()).toHaveTextContent("Noe gikk galt."));
  });
});

describe("RecipeActions: mappe (Story 3.3)", () => {
  const folders = [
    { id: 1, name: "Hverdag" },
    { id: 2, name: "Helg" },
  ];

  const openDialog = async (user: ReturnType<typeof userEvent.setup>, name: RegExp | string) => {
    await user.click(screen.getByRole("button", { name }));
    return screen.getByRole("dialog", { name: "Lagre i mappe" });
  };

  it("knappen viser mappenavnet, med aria-label «<navn>, bytt mappe»", () => {
    setup({ saved: true, folders, folderId: 1 });
    const button = screen.getByRole("button", { name: "Hverdag, bytt mappe" });
    expect(button).toHaveTextContent("Hverdag");
    expect(screen.queryByRole("button", { name: "Lagre i mappe" })).not.toBeInTheDocument();
  });

  it("vises ikke for en oppskrift som ikke er lagret", () => {
    setup({ saved: false, folders, folderId: null });
    expect(screen.queryByRole("button", { name: /mappe/ })).not.toBeInTheDocument();
  });

  it("åpner dialogen med forhåndsvalgt mappe og startfokus på det valgte alternativet", async () => {
    const user = userEvent.setup();
    setup({ saved: true, folders, folderId: 2 });
    const dialog = await openDialog(user, "Helg, bytt mappe");
    expect(within(dialog).getByRole("radio", { name: "Helg" })).toBeChecked();
    expect(within(dialog).getByRole("radio", { name: "Helg" })).toHaveFocus();
  });

  it("legger oppskriften i en mappe: lukker dialogen, fokus til mappeknappen og «Lagret i <navn>.» i 3 s", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onMoveToFolder = vi.fn().mockResolvedValue({ ok: true, folderName: "Hverdag" });
    const { rerender, onSave, onDelete } = setup({ saved: true, folders, onMoveToFolder });
    const dialog = await openDialog(user, "Lagre i mappe");
    await user.click(within(dialog).getByRole("radio", { name: "Hverdag" }));
    await user.click(within(dialog).getByRole("button", { name: "Lagre" }));

    expect(onMoveToFolder).toHaveBeenCalledExactlyOnceWith(1);
    await waitFor(() => expect(status()).toHaveTextContent("Lagret i Hverdag."));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Siden revalideres: knappen viser det nye navnet og har fokus.
    rerender(
      <RecipeActions
        title="Pannekaker"
        saved
        onSave={onSave}
        onDelete={onDelete}
        {...folderProps}
        folders={folders}
        folderId={1}
      />,
    );
    expect(screen.getByRole("button", { name: "Hverdag, bytt mappe" })).toHaveFocus();

    act(() => vi.advanceTimersByTime(2900));
    expect(status()).toHaveTextContent("Lagret i Hverdag.");
    act(() => vi.advanceTimersByTime(200));
    expect(status()).toBeEmptyDOMElement();
  });

  it("«Ingen mappe» tar oppskriften ut av mappen: «Fjernet fra mappen.»", async () => {
    const user = userEvent.setup();
    const onMoveToFolder = vi.fn().mockResolvedValue({ ok: true, folderName: null });
    setup({ saved: true, folders, folderId: 1, onMoveToFolder });
    const dialog = await openDialog(user, "Hverdag, bytt mappe");
    await user.click(within(dialog).getByRole("radio", { name: "Ingen mappe" }));
    await user.click(within(dialog).getByRole("button", { name: "Lagre" }));
    expect(onMoveToFolder).toHaveBeenCalledExactlyOnceWith(null);
    await waitFor(() => expect(status()).toHaveTextContent("Fjernet fra mappen."));
    expect(screen.getByRole("button", { name: "Hverdag, bytt mappe" })).toHaveFocus();
  });

  it("å velge mappen oppskriften allerede ligger i endrer ingenting og lukker dialogen", async () => {
    const user = userEvent.setup();
    const onMoveToFolder = vi.fn();
    setup({ saved: true, folders, folderId: 1, onMoveToFolder });
    const dialog = await openDialog(user, "Hverdag, bytt mappe");
    await user.click(within(dialog).getByRole("button", { name: "Lagre" }));
    expect(onMoveToFolder).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(status()).toBeEmptyDOMElement();
    expect(screen.getByRole("button", { name: "Hverdag, bytt mappe" })).toHaveFocus();
  });

  it("«Ny mappe»: feltet vises med fokus, og navnet sendes til onMoveToNewFolder", async () => {
    const user = userEvent.setup();
    const onMoveToNewFolder = vi.fn().mockResolvedValue({ ok: true, folderName: "Fest" });
    setup({ saved: true, folders, onMoveToNewFolder });
    const dialog = await openDialog(user, "Lagre i mappe");
    await user.click(within(dialog).getByRole("radio", { name: "Ny mappe" }));
    const field = within(dialog).getByRole("textbox", { name: "Navn på ny mappe" });
    expect(field).toHaveFocus();
    await user.type(field, "Fest");
    await user.click(within(dialog).getByRole("button", { name: "Lagre" }));
    expect(onMoveToNewFolder).toHaveBeenCalledExactlyOnceWith("Fest");
    await waitFor(() => expect(status()).toHaveTextContent("Lagret i Fest."));
  });

  it("ugyldig navn: melding under feltet, dialogen blir åpen og fokus går til feltet", async () => {
    const user = userEvent.setup();
    const onMoveToNewFolder = vi.fn().mockResolvedValue({
      ok: false,
      field: "name",
      message: "Du har allerede en mappe med dette navnet.",
    });
    setup({ saved: true, folders, onMoveToNewFolder });
    const dialog = await openDialog(user, "Lagre i mappe");
    await user.click(within(dialog).getByRole("radio", { name: "Ny mappe" }));
    const field = within(dialog).getByRole("textbox", { name: "Navn på ny mappe" });
    await user.type(field, "hverdag");
    await user.click(within(dialog).getByRole("button", { name: "Lagre" }));

    await waitFor(() =>
      expect(field).toHaveAccessibleDescription("Du har allerede en mappe med dette navnet."),
    );
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveFocus();
    expect(screen.getByRole("dialog", { name: "Lagre i mappe" })).toBeVisible();
    expect(status()).toBeEmptyDOMElement();

    // Feilen forsvinner når brukeren skriver videre.
    await user.type(field, "x");
    expect(field).not.toHaveAttribute("aria-invalid");
  });

  it("annen feil: dialogen lukkes og meldingen vises i statusområdet", async () => {
    const user = userEvent.setup();
    const onMoveToFolder = vi
      .fn()
      .mockResolvedValue({ ok: false, message: "Vi fant ikke oppskriften." });
    setup({ saved: true, folders, onMoveToFolder });
    const dialog = await openDialog(user, "Lagre i mappe");
    await user.click(within(dialog).getByRole("radio", { name: "Helg" }));
    await user.click(within(dialog).getByRole("button", { name: "Lagre" }));
    await waitFor(() => expect(status()).toHaveTextContent("Vi fant ikke oppskriften."));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("kastet feil gir reservemelding", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    setup({ saved: true, folders, onMoveToFolder: vi.fn().mockRejectedValue(new Error("nett")) });
    const dialog = await openDialog(user, "Lagre i mappe");
    await user.click(within(dialog).getByRole("radio", { name: "Helg" }));
    await user.click(within(dialog).getByRole("button", { name: "Lagre" }));
    await waitFor(() => expect(status()).toHaveTextContent("Noe gikk galt."));
  });

  it("«Avbryt» og Escape lukker uten å lagre, og fokus går tilbake til mappeknappen", async () => {
    const user = userEvent.setup();
    const onMoveToFolder = vi.fn();
    setup({ saved: true, folders, onMoveToFolder });
    const trigger = screen.getByRole("button", { name: "Lagre i mappe" });
    const dialog = await openDialog(user, "Lagre i mappe");
    await user.click(within(dialog).getByRole("button", { name: "Avbryt" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(onMoveToFolder).not.toHaveBeenCalled();
  });

  it("dialogen starter på nytt ved hver åpning (valg og navn nullstilles)", async () => {
    const user = userEvent.setup();
    setup({ saved: true, folders });
    let dialog = await openDialog(user, "Lagre i mappe");
    await user.click(within(dialog).getByRole("radio", { name: "Ny mappe" }));
    await user.type(within(dialog).getByRole("textbox"), "Utkast");
    await user.click(within(dialog).getByRole("button", { name: "Avbryt" }));

    dialog = await openDialog(user, "Lagre i mappe");
    expect(within(dialog).getByRole("radio", { name: "Ingen mappe" })).toBeChecked();
    expect(within(dialog).queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("«Lagret.» erstattes av mappemeldingen med ny tidtaker", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onMoveToFolder = vi.fn().mockResolvedValue({ ok: true, folderName: "Helg" });
    setup({ saved: true, folders, onMoveToFolder });
    const dialog = await openDialog(user, "Lagre i mappe");
    await user.click(within(dialog).getByRole("radio", { name: "Helg" }));
    await user.click(within(dialog).getByRole("button", { name: "Lagre" }));
    await waitFor(() => expect(status()).toHaveTextContent("Lagret i Helg."));
    act(() => vi.advanceTimersByTime(3100));
    expect(status()).toBeEmptyDOMElement();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("RecipeActions: hjerte (Story 3.4)", () => {
  const heart = () => screen.getByRole("button", { name: "Favoritt: Pannekaker" });

  it("vises ikke for en oppskrift som ikke er lagret", () => {
    setup({ saved: false });
    expect(screen.queryByRole("button", { name: /Favoritt/ })).not.toBeInTheDocument();
  });

  it("står ved siden av mappeknappen og «Slett» for en lagret oppskrift, først i linjen", () => {
    setup({ saved: true });
    const buttons = screen
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label") ?? b.textContent);
    expect(buttons).toEqual(["Favoritt: Pannekaker", "Lagre i mappe", "Slett Pannekaker"]);
  });

  it("aria-pressed følger isFavorite", () => {
    const { unmount } = setup({ saved: true, isFavorite: false });
    expect(heart()).toHaveAttribute("aria-pressed", "false");
    unmount();
    setup({ saved: true, isFavorite: true });
    expect(heart()).toHaveAttribute("aria-pressed", "true");
  });

  it("markering: kaller onSetFavorite(true) og sier «Lagt til i favoritter.» i 3 sekunder", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSetFavorite = vi.fn().mockResolvedValue({ ok: true });
    setup({ saved: true, onSetFavorite });
    await user.click(heart());
    expect(onSetFavorite).toHaveBeenCalledExactlyOnceWith(true);
    await waitFor(() => expect(status()).toHaveTextContent("Lagt til i favoritter."));
    act(() => vi.advanceTimersByTime(2000));
    expect(status()).toHaveTextContent("Lagt til i favoritter.");
    act(() => vi.advanceTimersByTime(1100));
    expect(status()).toBeEmptyDOMElement();
  });

  it("avmarkering: sier «Fjernet fra favoritter.»", async () => {
    const user = userEvent.setup();
    const onSetFavorite = vi.fn().mockResolvedValue({ ok: true });
    setup({ saved: true, isFavorite: true, onSetFavorite });
    await user.click(heart());
    expect(onSetFavorite).toHaveBeenCalledExactlyOnceWith(false);
    await waitFor(() => expect(status()).toHaveTextContent("Fjernet fra favoritter."));
    expect(heart()).toHaveAttribute("aria-pressed", "false");
  });

  it("feil: hjertet rulles tilbake og meldingen står i statusområdet til neste handling", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSetFavorite = vi
      .fn()
      .mockResolvedValue({ ok: false, message: "Vi fant ikke oppskriften." });
    setup({ saved: true, onSetFavorite });
    await user.click(heart());
    await waitFor(() => expect(status()).toHaveTextContent("Vi fant ikke oppskriften."));
    expect(heart()).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(10_000));
    expect(status()).toHaveTextContent("Vi fant ikke oppskriften.");
  });

  it("ny isFavorite fra serveren (revalidering) oppdaterer hjertet", () => {
    const { rerender } = setup({ saved: true, isFavorite: false });
    rerender(
      <RecipeActions
        title="Pannekaker"
        saved
        onSave={vi.fn()}
        onDelete={vi.fn()}
        {...folderProps}
        isFavorite
      />,
    );
    expect(heart()).toHaveAttribute("aria-pressed", "true");
  });

  it("endrer ikke mappeknappen eller «Slett»", async () => {
    const user = userEvent.setup();
    setup({ saved: true });
    await user.click(heart());
    expect(screen.getByRole("button", { name: "Lagre i mappe" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Slett Pannekaker" })).toBeEnabled();
  });
});

describe("RecipeActions: valgt antall følger med «Lagre» (issue 009)", () => {
  function Picker() {
    const report = useReportSelectedServings();
    return (
      <button type="button" onClick={() => report(5)}>
        Velg 5
      </button>
    );
  }

  it("sender antallet porsjonsvelgeren har meldt, ellers ingenting", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue({ ok: true });
    render(
      <SelectedServingsProvider>
        <Picker />
        <RecipeActions
          title="Pannekaker"
          saved={false}
          onSave={onSave}
          onDelete={vi.fn()}
          {...folderProps}
        />
      </SelectedServingsProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Velg 5" }));
    await user.click(screen.getByRole("button", { name: "Lagre" }));
    expect(onSave).toHaveBeenCalledExactlyOnceWith(5);
  });

  it("uten valgt antall (eller uten leverandør) kalles onSave uten antall", async () => {
    const user = userEvent.setup();
    const { onSave } = setup();
    await user.click(screen.getByRole("button", { name: "Lagre" }));
    expect(onSave).toHaveBeenCalledExactlyOnceWith(undefined);
  });
});
