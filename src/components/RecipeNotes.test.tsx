// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import RecipeNotes, { formatCookedDate } from "./RecipeNotes";

afterEach(cleanup);

function setup(overrides: Partial<React.ComponentProps<typeof RecipeNotes>> = {}) {
  const props = {
    notes: null,
    fitsFor: null,
    lastCookedAt: null,
    cookedCount: 0,
    onSaveNotes: vi.fn(async () => ({ ok: true as const })),
    onSaveFitsFor: vi.fn(async () => ({ ok: true as const })),
    onCooked: vi.fn(async () => ({
      ok: true as const,
      lastCookedAt: "2026-11-10T18:00:00.000Z",
      cookedCount: 1,
    })),
    onUndoCooked: vi.fn(async () => ({
      ok: true as const,
      lastCookedAt: null as string | null,
      cookedCount: 0,
    })),
    ...overrides,
  };
  render(<RecipeNotes {...props} />);
  return props;
}

describe("RecipeNotes", () => {
  it("viser notatene og sist laget", () => {
    setup({ notes: "Halv sukker.", lastCookedAt: "2026-11-03T10:00:00.000Z", cookedCount: 4 });
    expect(screen.getByRole("heading", { name: "Notater" })).toBeInTheDocument();
    expect(screen.getByLabelText("Dine notater")).toHaveValue("Halv sukker.");
    expect(screen.getByText("Sist laget 3. november 2026 · laget 4 ganger")).toBeInTheDocument();
  });

  it("uten notater og aldri laget", () => {
    setup();
    expect(screen.getByLabelText("Dine notater")).toHaveValue("");
    expect(screen.getByText("Ikke laget ennå.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lagre notat" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("«Lagre notat» sender teksten og melder fra", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.type(screen.getByLabelText("Dine notater"), "Stek kortere.");
    await user.click(screen.getByRole("button", { name: "Lagre notat" }));
    expect(props.onSaveNotes).toHaveBeenCalledWith("Stek kortere.");
    expect(await screen.findByText("Notatet er lagret.")).toBeInTheDocument();
  });

  it("«Passer til» vises og lagres sammen med notatene, og bare det som er endret sendes", async () => {
    const user = userEvent.setup();
    const props = setup({ fitsFor: "4 barn" });
    expect(screen.getByLabelText("Passer til")).toHaveValue("4 barn");
    await user.clear(screen.getByLabelText("Passer til"));
    await user.type(screen.getByLabelText("Passer til"), "2 sultne");
    await user.click(screen.getByRole("button", { name: "Lagre notat" }));
    expect(props.onSaveFitsFor).toHaveBeenCalledWith("2 sultne");
    expect(props.onSaveNotes).not.toHaveBeenCalled();
    expect(await screen.findByText("Notatet er lagret.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lagre notat" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("feil i «Passer til» vises, og notatene lagres likevel", async () => {
    const user = userEvent.setup();
    const props = setup({
      onSaveFitsFor: vi.fn(async () => ({
        ok: false as const,
        message: "«Passer til» kan være maks 60 tegn. Gjør den kortere.",
      })),
    });
    await user.type(screen.getByLabelText("Passer til"), "for lang");
    await user.type(screen.getByLabelText("Dine notater"), "Halv sukker.");
    await user.click(screen.getByRole("button", { name: "Lagre notat" }));
    expect(props.onSaveNotes).toHaveBeenCalledWith("Halv sukker.");
    expect(await screen.findByRole("alert")).toHaveTextContent("maks 60 tegn");
  });

  it("viser feilen under feltet og beholder teksten", async () => {
    const user = userEvent.setup();
    setup({
      onSaveNotes: vi.fn(async () => ({
        ok: false as const,
        message: "Notatene kan være maks 2000 tegn. Gjør dem kortere.",
      })),
    });
    await user.type(screen.getByLabelText("Dine notater"), "Lang tekst");
    await user.click(screen.getByRole("button", { name: "Lagre notat" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("maks 2000 tegn");
    expect(screen.getByLabelText("Dine notater")).toHaveValue("Lang tekst");
    expect(screen.getByLabelText("Dine notater")).toHaveAttribute("aria-invalid", "true");
  });

  it("«Laget i dag» oppdaterer dato og antall", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole("button", { name: "Laget i dag" }));
    expect(props.onCooked).toHaveBeenCalled();
    expect(
      await screen.findByText("Sist laget 10. november 2026 · laget 1 gang"),
    ).toBeInTheDocument();
    expect(screen.getByText("Merket som laget i dag.")).toBeInTheDocument();
  });

  it("«Angre» vises først etter «Laget i dag» og sender tilbake forrige dato", async () => {
    const user = userEvent.setup();
    const props = setup({ lastCookedAt: "2026-11-03T10:00:00.000Z", cookedCount: 4 });
    expect(screen.queryByRole("button", { name: "Angre" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Laget i dag" }));
    await user.click(await screen.findByRole("button", { name: "Angre" }));
    expect(props.onUndoCooked).toHaveBeenCalledWith("2026-11-03T10:00:00.000Z");
    expect(await screen.findByText("Ikke laget ennå.")).toBeInTheDocument();
    expect(screen.getByText(/Angret\./)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Angre" })).not.toBeInTheDocument();
  });

  it("feil ved angring vises, og man kan prøve igjen", async () => {
    const user = userEvent.setup();
    setup({
      onUndoCooked: vi.fn(async () => ({ ok: false as const, message: "Fant ikke oppskriften." })),
    });
    await user.click(screen.getByRole("button", { name: "Laget i dag" }));
    await user.click(await screen.findByRole("button", { name: "Angre" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Fant ikke oppskriften.");
    expect(screen.getByRole("button", { name: "Angre" })).toBeInTheDocument();
  });

  it("har en lenke til statistikken", () => {
    setup();
    expect(screen.getByRole("link", { name: "Se statistikk" })).toHaveAttribute(
      "href",
      "/statistikk",
    );
  });

  it("feil fra serveren eller nettet vises og logges", async () => {
    const user = userEvent.setup();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    setup({ onCooked: vi.fn(async () => Promise.reject(new Error("nett"))) });
    await user.click(screen.getByRole("button", { name: "Laget i dag" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});

describe("formatCookedDate", () => {
  it("bruker norsk tid, også nær midnatt", () => {
    expect(formatCookedDate("2026-11-10T23:30:00.000Z")).toBe("11. november 2026");
  });
});
