// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import FolderNameForm from "./FolderNameForm";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function setup(overrides: Partial<React.ComponentProps<typeof FolderNameForm>> = {}) {
  const onSubmit = vi.fn().mockResolvedValue({ ok: true });
  render(
    <FolderNameForm
      label="Ny mappe"
      hint="Gi mappen et navn."
      submitLabel="Opprett mappe"
      pendingLabel="Oppretter …"
      onSubmit={onSubmit}
      {...overrides}
    />,
  );
  return { onSubmit };
}

const field = () => screen.getByRole("textbox", { name: "Ny mappe" });

describe("FolderNameForm", () => {
  it("sender det skrevne navnet, også med Enter, og tømmer feltet ved suksess hvis ønsket", async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup({ clearOnSuccess: true });
    await user.type(field(), "Hverdag{Enter}");
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith("Hverdag");
    await waitFor(() => expect(field()).toHaveValue(""));
  });

  it("beholder navnet ved suksess uten clearOnSuccess og kaller onSuccess", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    setup({ initialName: "Gammel", onSuccess });
    await user.click(screen.getByRole("button", { name: "Opprett mappe" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(field()).toHaveValue("Gammel");
  });

  it("feil: melding under feltet med aria-describedby og aria-invalid, fokus i feltet", async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn()
      .mockResolvedValue({ ok: false, field: "name", message: "Skriv et navn på mappen." });
    setup({ onSubmit });
    await user.click(screen.getByRole("button", { name: "Opprett mappe" }));
    const message = await screen.findByText("Skriv et navn på mappen.");
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(field()).toHaveAccessibleDescription("Gi mappen et navn. Skriv et navn på mappen.");
    expect(field().getAttribute("aria-describedby")).toContain(message.id);
    expect(field()).toHaveFocus();
  });

  it("feilen forsvinner når brukeren skriver, og fokus flyttes igjen ved samme feil", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({ ok: false, field: "name", message: "Feil." });
    setup({ onSubmit });
    await user.click(screen.getByRole("button", { name: "Opprett mappe" }));
    await screen.findByText("Feil.");
    await user.type(field(), "x");
    expect(screen.queryByText("Feil.")).not.toBeInTheDocument();
    expect(field()).not.toHaveAttribute("aria-invalid");

    await user.click(screen.getByRole("button", { name: "Opprett mappe" }));
    await screen.findByText("Feil.");
    expect(field()).toHaveFocus();
  });

  it("kastet feil gir reservemelding under feltet", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    setup({ onSubmit: vi.fn().mockRejectedValue(new Error("nett")) });
    await user.click(screen.getByRole("button", { name: "Opprett mappe" }));
    expect(await screen.findByText(/Noe gikk galt/)).toBeInTheDocument();
  });

  it("under innsending er knappen deaktivert og viser pendingLabel, og dobbel innsending ignoreres", async () => {
    const user = userEvent.setup();
    let finish!: (value: { ok: true }) => void;
    const onSubmit = vi.fn(() => new Promise<{ ok: true }>((resolve) => (finish = resolve)));
    setup({ onSubmit });
    await user.type(field(), "A{Enter}");
    const pending = screen.getByRole("button", { name: "Oppretter …" });
    expect(pending).toBeDisabled();
    await user.type(field(), "{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await act(async () => finish({ ok: true }));
    expect(screen.getByRole("button", { name: "Opprett mappe" })).toBeEnabled();
  });

  it("autoFocus gir feltet fokus ved visning", () => {
    setup({ autoFocus: true });
    expect(field()).toHaveFocus();
  });

  it("«Avbryt» og Escape kaller onCancel, og knappene kan ha eget tilgjengelig navn", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    setup({
      cancel: { label: "Avbryt", ariaLabel: "Avbryt nytt navn for Hverdag", onCancel },
      submitAriaLabel: "Lagre nytt navn for Hverdag",
    });
    expect(screen.getByRole("button", { name: "Lagre nytt navn for Hverdag" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Avbryt nytt navn for Hverdag" }));
    await user.type(field(), "{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("Escape gjør ingenting uten avbryt-knapp", async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await user.type(field(), "{Escape}");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
