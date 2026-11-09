// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RecipeActions from "./RecipeActions";

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

function setup(overrides: Partial<React.ComponentProps<typeof RecipeActions>> = {}) {
  const onSave = vi.fn().mockResolvedValue({ ok: true });
  const onDelete = vi.fn().mockResolvedValue(undefined);
  const view = render(
    <RecipeActions
      title="Pannekaker"
      saved={false}
      onSave={onSave}
      onDelete={onDelete}
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
    rerender(<RecipeActions title="Pannekaker" saved onSave={onSave} onDelete={onDelete} />);
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
      <RecipeActions title="Pannekaker" saved={false} onSave={onSave} onDelete={onDelete} />,
    );
  });

  it("«Lagret.» står igjen og «Slett» kommer når siden oppdateres til lagret", async () => {
    const user = userEvent.setup();
    const { rerender, onSave, onDelete } = setup();
    await user.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => expect(status()).toHaveTextContent("Lagret."));
    rerender(<RecipeActions title="Pannekaker" saved onSave={onSave} onDelete={onDelete} />);
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
      "«Pannekaker» fjernes fra samlingen. Du kan ikke angre.",
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
