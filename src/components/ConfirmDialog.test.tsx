// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ConfirmDialog from "./ConfirmDialog";

// jsdom mangler showModal og close; stubbene speiler `open`-attributtet.
const showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
});
const close = vi.fn(function (this: HTMLDialogElement) {
  this.removeAttribute("open");
});

beforeEach(() => {
  showModal.mockClear();
  close.mockClear();
  HTMLDialogElement.prototype.showModal = showModal;
  HTMLDialogElement.prototype.close = close;
});
afterEach(cleanup);

type Overrides = Partial<React.ComponentProps<typeof ConfirmDialog>>;

const props = (overrides: Overrides = {}) => ({
  open: true,
  title: "Slette oppskriften?",
  description: "«Pannekaker» fjernes fra samlingen. Du kan ikke angre.",
  confirmLabel: "Slett",
  cancelLabel: "Avbryt",
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
  ...overrides,
});

function Owner(overrides: Overrides) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Åpne
      </button>
      <ConfirmDialog {...props({ ...overrides, open, onCancel: () => setOpen(false) })} />
    </>
  );
}

describe("ConfirmDialog", () => {
  it("åpnes med showModal og er en navngitt dialog med tittel og tekst", () => {
    render(<ConfirmDialog {...props()} />);
    expect(showModal).toHaveBeenCalledTimes(1);
    const dialog = screen.getByRole("dialog", { name: "Slette oppskriften?" });
    expect(dialog).toHaveAccessibleDescription(
      "«Pannekaker» fjernes fra samlingen. Du kan ikke angre.",
    );
    expect(screen.getByRole("heading", { level: 2, name: "Slette oppskriften?" })).toBeVisible();
  });

  it("er lukket (og skjult) når open er false, uten å kalle showModal", () => {
    render(<ConfirmDialog {...props({ open: false })} />);
    expect(showModal).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("gir startfokus til «Avbryt»", () => {
    render(<ConfirmDialog {...props()} />);
    expect(screen.getByRole("button", { name: "Avbryt" })).toHaveFocus();
  });

  it("«Slett» kaller onConfirm og «Avbryt» kaller onCancel", async () => {
    const user = userEvent.setup();
    const p = props();
    render(<ConfirmDialog {...p} />);
    await user.click(screen.getByRole("button", { name: "Slett" }));
    expect(p.onConfirm).toHaveBeenCalledTimes(1);
    expect(p.onCancel).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Avbryt" }));
    expect(p.onCancel).toHaveBeenCalledTimes(1);
  });

  it("deaktiverer «Slett» mens handlingen pågår", async () => {
    const user = userEvent.setup();
    const p = props({ pending: true });
    render(<ConfirmDialog {...p} />);
    expect(screen.getByRole("button", { name: "Slett" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Slett" }));
    expect(p.onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Avbryt" })).toBeEnabled();
  });

  it("Escape (cancel-hendelsen) kaller onCancel og lukker ikke dialogen selv", () => {
    const p = props();
    render(<ConfirmDialog {...p} />);
    const dialog = screen.getByRole("dialog");
    const notPrevented = fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(notPrevented).toBe(false); // preventDefault er kalt
    expect(p.onCancel).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
    expect(dialog).toHaveAttribute("open");
  });

  it("trykk på bakgrunnen gjør ingenting", async () => {
    const user = userEvent.setup();
    const p = props();
    render(<ConfirmDialog {...p} />);
    await user.click(screen.getByRole("dialog"));
    expect(p.onCancel).not.toHaveBeenCalled();
    expect(p.onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveAttribute("open");
  });

  it("lukkes av eieren, og fokus går tilbake til knappen som åpnet dialogen", async () => {
    const user = userEvent.setup();
    render(<Owner />);
    const trigger = screen.getByRole("button", { name: "Åpne" });
    await user.click(trigger);
    expect(screen.getByRole("button", { name: "Avbryt" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Avbryt" }));
    expect(close).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("Escape i eierstyrt dialog lukker via eieren og gir fokus tilbake", async () => {
    const user = userEvent.setup();
    render(<Owner />);
    const trigger = screen.getByRole("button", { name: "Åpne" });
    await user.click(trigger);
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("tolker en lukking utenfra (close-hendelsen) som «Avbryt» mens eieren har den åpen", () => {
    const p = props();
    render(<ConfirmDialog {...p} />);
    fireEvent(screen.getByRole("dialog", { hidden: true }), new Event("close"));
    expect(p.onCancel).toHaveBeenCalledTimes(1);
  });

  it("kan åpnes på nytt etter å ha vært lukket", async () => {
    const user = userEvent.setup();
    render(<Owner />);
    await user.click(screen.getByRole("button", { name: "Åpne" }));
    await user.click(screen.getByRole("button", { name: "Avbryt" }));
    await user.click(screen.getByRole("button", { name: "Åpne" }));
    expect(showModal).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Avbryt" })).toHaveFocus();
  });
});
