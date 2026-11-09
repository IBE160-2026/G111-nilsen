// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Dialog, { DialogActions, DialogButton } from "./Dialog";

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

function Owner({ description }: { description?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Åpne
      </button>
      <Dialog
        open={open}
        title="Tittel"
        description={description}
        onCancel={() => setOpen(false)}
        getInitialFocus={() => document.getElementById("andre")}
      >
        <DialogActions>
          <DialogButton variant="secondary" id="forste" onClick={() => setOpen(false)}>
            Første
          </DialogButton>
          <DialogButton variant="primary" id="andre">
            Andre
          </DialogButton>
        </DialogActions>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("åpnes med showModal, er navngitt av tittelen, og eieren velger startfokus", async () => {
    const user = userEvent.setup();
    render(<Owner />);
    await user.click(screen.getByRole("button", { name: "Åpne" }));
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog", { name: "Tittel" })).not.toHaveAttribute("aria-describedby");
    expect(screen.getByRole("heading", { level: 2, name: "Tittel" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Andre" })).toHaveFocus();
  });

  it("kobler en valgfri beskrivelse til dialogen", async () => {
    const user = userEvent.setup();
    render(<Owner description="Forklaring" />);
    await user.click(screen.getByRole("button", { name: "Åpne" }));
    expect(screen.getByRole("dialog")).toHaveAccessibleDescription("Forklaring");
  });

  it("er lukket uten å kalle showModal når open er false", () => {
    render(<Owner />);
    expect(showModal).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Escape går til eieren, og fokus går tilbake til knappen som åpnet dialogen", async () => {
    const user = userEvent.setup();
    render(<Owner />);
    const trigger = screen.getByRole("button", { name: "Åpne" });
    await user.click(trigger);
    expect(fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }))).toBe(
      false,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("tolker lukking utenfra (close-hendelsen) som avbryt mens eieren har den åpen", async () => {
    const user = userEvent.setup();
    render(<Owner />);
    await user.click(screen.getByRole("button", { name: "Åpne" }));
    fireEvent(screen.getByRole("dialog"), new Event("close"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("DialogButton har type button som standard og kan overstyres", () => {
    render(
      <>
        <DialogButton variant="primary">A</DialogButton>
        <DialogButton variant="primary" type="submit">
          B
        </DialogButton>
      </>,
    );
    expect(screen.getByRole("button", { name: "A" })).toHaveAttribute("type", "button");
    expect(screen.getByRole("button", { name: "B" })).toHaveAttribute("type", "submit");
  });
});
