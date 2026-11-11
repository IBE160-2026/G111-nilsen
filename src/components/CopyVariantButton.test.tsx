// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import CopyVariantButton from "./CopyVariantButton";

afterEach(cleanup);

describe("CopyVariantButton", () => {
  it("har en knapp med tittelen i det tilgjengelige navnet", () => {
    render(<CopyVariantButton title="Taco" onCopy={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Lag egen variant av Taco" })).toHaveTextContent(
      "Lag egen variant",
    );
  });

  it("viser «Lager variant …» mens den jobber, og ignorerer nye trykk", async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<CopyVariantButton title="Taco" onCopy={onCopy} />);
    const button = screen.getByRole("button");
    await user.click(button);
    await user.click(button);
    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(button).toHaveTextContent("Lager variant …");
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  it("en feilmelding vises, og knappen kan brukes igjen", async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn().mockResolvedValue({ ok: false, message: "Noe gikk galt." });
    render(<CopyVariantButton title="Taco" onCopy={onCopy} />);
    await user.click(screen.getByRole("button"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Noe gikk galt.");
    expect(screen.getByRole("button")).toHaveTextContent("Lag egen variant");
    await user.click(screen.getByRole("button"));
    expect(onCopy).toHaveBeenCalledTimes(2);
  });

  it("et kast gir en vanlig feilmelding", async () => {
    const user = userEvent.setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<CopyVariantButton title="Taco" onCopy={vi.fn().mockRejectedValue(new Error("x"))} />);
    await user.click(screen.getByRole("button"));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
