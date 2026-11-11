// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import WeekPlan, { type WeekDay, type WeekEntry, type WeekRecipe } from "./WeekPlan";

afterEach(cleanup);

const days: WeekDay[] = [
  { day: "2026-11-09", label: "mandag 9. november", isToday: false },
  { day: "2026-11-10", label: "tirsdag 10. november", isToday: true },
];
const recipes: WeekRecipe[] = [
  { id: 1, title: "Pannekaker", originalServings: 4, selectedServings: null },
  { id: 2, title: "Taco", originalServings: 4, selectedServings: 2.5 },
];
const entries: WeekEntry[] = [
  { id: 10, day: "2026-11-09", servings: 2, recipeId: 2, title: "Taco" },
];

function setup(overrides: Partial<Parameters<typeof WeekPlan>[0]> = {}) {
  const onAdd = vi.fn(async () => ({ ok: true as const, id: 11 }));
  const onRemove = vi.fn(async () => ({ ok: true as const }));
  render(
    <WeekPlan
      days={days}
      entries={entries}
      recipes={recipes}
      shoppingHref="/handleliste?uke=2026-11-09"
      onAdd={onAdd}
      onRemove={onRemove}
      {...overrides}
    />,
  );
  return { onAdd, onRemove, user: userEvent.setup() };
}

const day = (label: string) =>
  screen.getByRole("heading", { level: 2, name: new RegExp(label) }).closest("li")!;

describe("WeekPlan", () => {
  it("sier at uka lagres automatisk, med lenke til alle uker, og at den er lagret etter en endring", async () => {
    const { user } = setup();
    expect(
      screen.getByText(/Ukemenyen lagres automatisk når du legger til eller fjerner en rett\./),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Se alle uker" })).toHaveAttribute(
      "href",
      "/ukemeny/uker",
    );
    await user.click(screen.getAllByRole("button", { name: /^Fjern /i })[0]!);
    expect(await screen.findByText(/Uka er lagret\./)).toBeInTheDocument();
  });

  it("søker etter oppskrift: skriv for å filtrere, piltaster og Enter velger uten å sende", async () => {
    const { onAdd, user } = setup();
    const form = screen.getByRole("form", { name: "Legg til på mandag 9. november" });
    const box = within(form).getByRole("combobox", { name: "Oppskrift" });
    expect(box).toHaveAttribute("placeholder", "Søk etter oppskrift");
    expect(box).toHaveAttribute("aria-expanded", "false");
    await user.click(box);
    expect(box).toHaveAttribute("aria-expanded", "true");
    const list = within(form).getByRole("listbox", { name: "Oppskrift" });
    expect(
      within(list)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Pannekaker", "Taco"]);
    await user.type(box, "TAC");
    expect(
      within(list)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Taco"]);
    await user.clear(box);
    await user.keyboard("{ArrowDown}");
    expect(box).toHaveAttribute(
      "aria-activedescendant",
      within(list).getByRole("option", { name: "Taco" }).id,
    );
    await user.keyboard("{Enter}");
    expect(box).toHaveValue("Taco");
    expect(box).toHaveAttribute("aria-expanded", "false");
    expect(onAdd).not.toHaveBeenCalled();
    await user.keyboard("{Enter}");
    expect(onAdd).toHaveBeenCalledWith({ recipeId: 2, day: "2026-11-09", servings: 2.5 });
  });

  it("sier fra når ingen oppskrift passer, og Escape lukker listen", async () => {
    const { user } = setup();
    const form = screen.getByRole("form", { name: "Legg til på mandag 9. november" });
    const box = within(form).getByRole("combobox", { name: "Oppskrift" });
    await user.type(box, "lasagne");
    expect(within(form).getByRole("status")).toHaveTextContent(
      "Ingen lagrede oppskrifter passer «lasagne».",
    );
    await user.keyboard("{Escape}");
    expect(box).toHaveAttribute("aria-expanded", "false");
    expect(within(form).queryByRole("status")).not.toBeInTheDocument();
  });

  it("viser dagene med oppføringer, «i dag» og en tom dag", () => {
    setup();
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "mandag 9. november",
      "tirsdag 10. november · i dag",
    ]);
    const monday = day("mandag");
    expect(within(monday).getByRole("link", { name: "Taco" })).toHaveAttribute(
      "href",
      "/oppskrift/2",
    );
    expect(monday).toHaveTextContent("2 porsj.");
    expect(day("tirsdag")).toHaveTextContent("Ingenting planlagt.");
    expect(screen.getByRole("link", { name: "Lag handleliste for uka" })).toHaveAttribute(
      "href",
      "/handleliste?uke=2026-11-09",
    );
  });

  it("legger til med antallet oppskriften starter på når feltet er tomt", async () => {
    const { onAdd, user } = setup();
    const form = screen.getByRole("form", { name: "Legg til på tirsdag 10. november" });
    await user.type(within(form).getByRole("combobox", { name: "Oppskrift" }), "ta");
    await user.click(within(form).getByRole("option", { name: "Taco" }));
    expect(within(form).getByLabelText("Porsjoner")).toHaveAttribute("placeholder", "2,5");
    await user.click(within(form).getByRole("button", { name: "Legg til" }));
    expect(onAdd).toHaveBeenCalledWith({ recipeId: 2, day: "2026-11-10", servings: 2.5 });
    expect(within(day("tirsdag")).getByRole("link", { name: "Taco" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Taco er lagt på tirsdag 10. november.");
    expect(within(form).getByRole("combobox", { name: "Oppskrift" })).toHaveValue("");
  });

  it("bruker antallet som er skrevet inn, også med komma", async () => {
    const { onAdd, user } = setup();
    const form = screen.getByRole("form", { name: "Legg til på mandag 9. november" });
    // Skrevet helt likt en tittel regnes som valgt.
    await user.type(within(form).getByRole("combobox", { name: "Oppskrift" }), "pannekaker");
    await user.type(within(form).getByLabelText("Porsjoner"), "6");
    await user.click(within(form).getByRole("button", { name: "Legg til" }));
    expect(onAdd).toHaveBeenCalledWith({ recipeId: 1, day: "2026-11-09", servings: 6 });
  });

  it("viser en feil under skjemaet uten oppskrift, og når handlingen feiler", async () => {
    const onAdd = vi.fn(async () => ({ ok: false as const, message: "Noe gikk galt." }));
    const { user } = setup({ onAdd });
    const form = screen.getByRole("form", { name: "Legg til på mandag 9. november" });
    await user.click(within(form).getByRole("button", { name: "Legg til" }));
    expect(within(form).getByRole("alert")).toHaveTextContent("Velg en oppskrift fra listen.");
    const box = within(form).getByRole("combobox", { name: "Oppskrift" });
    expect(box).toHaveAttribute("aria-invalid", "true");
    expect(box).toHaveAccessibleDescription("Velg en oppskrift fra listen.");
    expect(onAdd).not.toHaveBeenCalled();
    await user.type(box, "pann");
    await user.keyboard("{Enter}");
    expect(box).toHaveValue("Pannekaker");
    await user.click(within(form).getByRole("button", { name: "Legg til" }));
    expect(within(form).getByRole("alert")).toHaveTextContent("Noe gikk galt.");
  });

  it("fjerner en oppføring", async () => {
    const { onRemove, user } = setup();
    await user.click(screen.getByRole("button", { name: "Fjern Taco fra mandag 9. november" }));
    expect(onRemove).toHaveBeenCalledWith(10);
    expect(day("mandag")).toHaveTextContent("Ingenting planlagt.");
    expect(screen.getByRole("status")).toHaveTextContent("Taco er fjernet fra mandag 9. november.");
  });

  it("beholder oppføringen og viser meldingen når fjerning feiler", async () => {
    const onRemove = vi.fn(async () => ({ ok: false as const, message: "Fant ikke." }));
    const { user } = setup({ onRemove });
    await user.click(screen.getByRole("button", { name: "Fjern Taco fra mandag 9. november" }));
    expect(within(day("mandag")).getByRole("link", { name: "Taco" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Fant ikke.");
  });
});
