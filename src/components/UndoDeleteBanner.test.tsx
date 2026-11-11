// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import UndoDeleteBanner from "./UndoDeleteBanner";

afterEach(cleanup);

describe("UndoDeleteBanner", () => {
  it("sier at oppskriften er slettet, med «Angre» og en lenke til «Nylig slettet»", () => {
    render(<UndoDeleteBanner title="Taco" onUndo={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Oppskriften «Taco» er slettet.");
    expect(screen.getByRole("button", { name: "Angre slettingen av Taco" })).toHaveTextContent(
      "Angre",
    );
    expect(screen.getByRole("link", { name: "Se nylig slettet" })).toHaveAttribute(
      "href",
      "/nylig-slettet",
    );
  });

  it("«Angre» kalles én gang selv ved dobbelttrykk, og viser «Henter tilbake …»", async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<UndoDeleteBanner title="Taco" onUndo={onUndo} />);
    const button = screen.getByRole("button");
    await user.click(button);
    await user.click(button);
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(button).toHaveTextContent("Henter tilbake …");
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  it("en feilmelding vises, og «Angre» kan prøves igjen", async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn().mockResolvedValue({ ok: false, message: "Finnes ikke lenger." });
    render(<UndoDeleteBanner title="Taco" onUndo={onUndo} />);
    await user.click(screen.getByRole("button"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Finnes ikke lenger.");
    expect(screen.getByRole("button")).toHaveTextContent("Angre");
    await user.click(screen.getByRole("button"));
    expect(onUndo).toHaveBeenCalledTimes(2);
  });

  it("et kast gir en vanlig feilmelding", async () => {
    const user = userEvent.setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<UndoDeleteBanner title="Taco" onUndo={vi.fn().mockRejectedValue(new Error("x"))} />);
    await user.click(screen.getByRole("button"));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
