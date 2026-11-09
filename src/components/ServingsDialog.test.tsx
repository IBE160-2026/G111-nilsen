// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { servingsDialogMessages as m } from "@/lib/messages";
import ServingsDialog from "./ServingsDialog";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});
afterEach(cleanup);

function setup(overrides: Partial<React.ComponentProps<typeof ServingsDialog>> = {}) {
  const props = {
    open: true,
    initial: 4,
    onSave: vi.fn().mockResolvedValue({ ok: true }),
    onSaved: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
  render(<ServingsDialog {...props} />);
  return props;
}

const field = () => screen.getByRole("textbox", { name: "Antall personer" });

describe("ServingsDialog", () => {
  it("er en navngitt dialog med spørsmålet, forklaring og porsjonsvelger uten «oppr.»", () => {
    setup();
    const dialog = screen.getByRole("dialog", { name: m.title });
    expect(dialog).toHaveAccessibleDescription(m.description);
    expect(within(dialog).getByRole("textbox", { name: "Antall personer" })).toHaveValue("4");
    expect(within(dialog).queryByText(/oppr\./)).toBeNull();
    expect(within(dialog).queryByRole("button", { name: /Tilbakestill/ })).toBeNull();
  });

  it("startfokus er i antallsfeltet", () => {
    setup();
    expect(field()).toHaveFocus();
  });

  it("er lukket og uten innhold når open er false", () => {
    setup({ open: false });
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("+ og − endrer antallet, «Lagre» sender det valgte tallet", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole("button", { name: "Flere personer" }));
    await user.click(screen.getByRole("button", { name: "Flere personer" }));
    await user.click(screen.getByRole("button", { name: "Færre personer" }));
    await user.click(screen.getByRole("button", { name: m.save }));
    expect(props.onSave).toHaveBeenCalledWith(5);
    await waitFor(() => expect(props.onSaved).toHaveBeenCalledWith(5));
  });

  it("antall skrevet inn og bekreftet med Tab lagres", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.clear(field());
    await user.type(field(), "12");
    await user.click(screen.getByRole("button", { name: m.save }));
    expect(props.onSave).toHaveBeenCalledWith(12);
  });

  it("ugyldig tall gir melding og beholder forrige verdi", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.clear(field());
    await user.type(field(), "abc");
    await user.tab();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: m.save }));
    expect(props.onSave).toHaveBeenCalledWith(4);
  });

  it("«Avbryt» og Escape avbryter uten å lagre", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole("button", { name: m.cancel }));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(props.onCancel).toHaveBeenCalledTimes(2);
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it("feil fra serveren vises i dialogen, og den blir åpen", async () => {
    const user = userEvent.setup();
    const props = setup({
      onSave: vi.fn().mockResolvedValue({ ok: false, message: "Noe gikk galt." }),
    });
    await user.click(screen.getByRole("button", { name: m.save }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Noe gikk galt.");
    expect(props.onSaved).not.toHaveBeenCalled();
  });

  it("uventet unntak gir reservemeldingen", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = userEvent.setup();
    setup({ onSave: vi.fn().mockRejectedValue(new Error("brudd")) });
    await user.click(screen.getByRole("button", { name: m.save }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Noe gikk galt.");
  });

  it("dobbeltklikk på «Lagre» lagrer én gang", async () => {
    const user = userEvent.setup();
    let release!: () => void;
    const gate = new Promise<void>((done) => (release = done));
    const props = setup({
      onSave: vi.fn(async () => {
        await gate;
        return { ok: true as const };
      }),
    });
    const save = screen.getByRole("button", { name: m.save });
    await user.dblClick(save);
    expect(props.onSave).toHaveBeenCalledTimes(1);
    release();
  });

  it("Enter i feltet lagrer det som står der", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.clear(field());
    await user.type(field(), "7{Enter}");
    expect(props.onSave).toHaveBeenCalledWith(7);
  });

  it("Enter med ugyldig tekst lagrer ikke", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.clear(field());
    await user.type(field(), "x{Enter}");
    expect(props.onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
