// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import RecipeLabels from "./RecipeLabels";

afterEach(cleanup);

describe("RecipeLabels", () => {
  it("viser merkelappene med Fjern-knapper, og en tekst når det ikke er noen", () => {
    const { unmount } = render(
      <RecipeLabels labels={["Hverdag", "Vegetar"]} onAdd={vi.fn()} onRemove={vi.fn()} />,
    );
    expect(screen.getByRole("list").textContent).toContain("Hverdag");
    expect(screen.getByRole("button", { name: "Fjern merkelappen Vegetar" })).toBeInTheDocument();
    unmount();
    render(<RecipeLabels labels={[]} onAdd={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText("Ingen merkelapper ennå.")).toBeInTheDocument();
  });

  it("legger til med «Legg til» og Enter, tømmer feltet og melder fra", async () => {
    const user = userEvent.setup();
    const onAdd = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, labels: ["Hverdag"] })
      .mockResolvedValueOnce({ ok: true, labels: ["Hverdag", "Vegetar"] });
    render(<RecipeLabels labels={[]} onAdd={onAdd} onRemove={vi.fn()} />);
    const field = screen.getByRole("textbox", { name: "Ny merkelapp" });
    await user.type(field, "  Hverdag ");
    await user.click(screen.getByRole("button", { name: "Legg til" }));
    expect(onAdd).toHaveBeenCalledWith("Hverdag");
    expect(await screen.findByText("Merkelappen Hverdag er lagt til.")).toBeInTheDocument();
    expect(field).toHaveValue("");
    await user.type(field, "Vegetar{Enter}");
    expect(onAdd).toHaveBeenCalledWith("Vegetar");
    expect(
      await screen.findByRole("button", { name: "Fjern merkelappen Vegetar" }),
    ).toBeInTheDocument();
  });

  it("sier fra uten tekst, og viser meldingen fra handlingen og beholder teksten", async () => {
    const user = userEvent.setup();
    const onAdd = vi
      .fn()
      .mockResolvedValue({ ok: false, message: "En merkelapp kan være opptil 30 tegn." });
    render(<RecipeLabels labels={[]} onAdd={onAdd} onRemove={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Legg til" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Skriv en merkelapp.");
    expect(onAdd).not.toHaveBeenCalled();
    await user.type(screen.getByRole("textbox", { name: "Ny merkelapp" }), "lang");
    await user.click(screen.getByRole("button", { name: "Legg til" }));
    expect(await screen.findByText("En merkelapp kan være opptil 30 tegn.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Ny merkelapp" })).toHaveValue("lang");
  });

  it("fjerner en merkelapp og melder fra, og beholder den når fjerningen feiler", async () => {
    const user = userEvent.setup();
    const onRemove = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, message: "Noe gikk galt." })
      .mockResolvedValueOnce({ ok: true, labels: ["Vegetar"] });
    render(<RecipeLabels labels={["Hverdag", "Vegetar"]} onAdd={vi.fn()} onRemove={onRemove} />);
    await user.click(screen.getByRole("button", { name: "Fjern merkelappen Hverdag" }));
    expect(await screen.findByText("Noe gikk galt.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fjern merkelappen Hverdag" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Fjern merkelappen Hverdag" }));
    expect(await screen.findByText("Merkelappen Hverdag er fjernet.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Fjern merkelappen Hverdag" }),
    ).not.toBeInTheDocument();
  });

  it("«Angre» legger den fjernede merkelappen tilbake (Story 6.23b)", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn().mockResolvedValue({ ok: true, labels: ["Vegetar"] });
    const onAdd = vi.fn().mockResolvedValue({ ok: true, labels: ["Vegetar", "Hverdag"] });
    render(<RecipeLabels labels={["Hverdag", "Vegetar"]} onAdd={onAdd} onRemove={onRemove} />);
    expect(screen.queryByRole("button", { name: "Angre" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Fjern merkelappen Hverdag" }));
    await user.click(await screen.findByRole("button", { name: "Angre" }));
    expect(onAdd).toHaveBeenCalledWith("Hverdag");
    expect(await screen.findByText("Merkelappen Hverdag er lagt tilbake.")).toBeInTheDocument();
    expect(screen.getByText("Hverdag")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Angre" })).not.toBeInTheDocument();
  });
});
