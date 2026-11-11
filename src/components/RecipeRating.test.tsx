// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import RecipeRating from "./RecipeRating";

afterEach(cleanup);

describe("RecipeRating", () => {
  it("uten vurdering: fem stjerner, ingen er valgt, og en tekst", () => {
    render(<RecipeRating rating={null} onSave={vi.fn()} />);
    expect(screen.getAllByRole("button")).toHaveLength(5);
    for (let n = 1; n <= 5; n++)
      expect(screen.getByRole("button", { name: `${n} av 5 stjerner` })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    expect(screen.getByText("Ikke vurdert ennå.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Fjern vurdering" })).not.toBeInTheDocument();
  });

  it("en stjerne lagrer, melder fra og viser «Fjern vurdering»", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue({ ok: true });
    render(<RecipeRating rating={null} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "4 av 5 stjerner" }));
    expect(onSave).toHaveBeenCalledWith(4);
    expect(await screen.findByText("Vurderingen er satt til 4 av 5.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "4 av 5 stjerner" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Fjern vurdering" })).toBeInTheDocument();
  });

  it("«Fjern vurdering» sender null", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue({ ok: true });
    render(<RecipeRating rating={2} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "Fjern vurdering" }));
    expect(onSave).toHaveBeenCalledWith(null);
    expect(await screen.findByText("Vurderingen er fjernet.")).toBeInTheDocument();
    expect(screen.getByText("Ikke vurdert ennå.")).toBeInTheDocument();
  });

  it("en feil viser meldingen og beholder den gamle vurderingen", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue({ ok: false, message: "Noe gikk galt." });
    render(<RecipeRating rating={3} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "5 av 5 stjerner" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Noe gikk galt.");
    expect(screen.getByRole("button", { name: "3 av 5 stjerner" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("et kast fra handlingen gir en vanlig feilmelding", async () => {
    const user = userEvent.setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<RecipeRating rating={null} onSave={vi.fn().mockRejectedValue(new Error("x"))} />);
    await user.click(screen.getByRole("button", { name: "1 av 5 stjerner" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
