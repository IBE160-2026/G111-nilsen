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
    expect(monday).toHaveTextContent("2 pers.");
    expect(day("tirsdag")).toHaveTextContent("Ingenting planlagt.");
    expect(screen.getByRole("link", { name: "Lag handleliste for uka" })).toHaveAttribute(
      "href",
      "/handleliste?uke=2026-11-09",
    );
  });

  it("legger til med antallet oppskriften starter på når feltet er tomt", async () => {
    const { onAdd, user } = setup();
    const form = screen.getByRole("form", { name: "Legg til på tirsdag 10. november" });
    await user.selectOptions(within(form).getByLabelText("Oppskrift"), "Taco");
    expect(within(form).getByLabelText("Personer")).toHaveAttribute("placeholder", "2,5");
    await user.click(within(form).getByRole("button", { name: "Legg til" }));
    expect(onAdd).toHaveBeenCalledWith({ recipeId: 2, day: "2026-11-10", servings: 2.5 });
    expect(within(day("tirsdag")).getByRole("link", { name: "Taco" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Taco er lagt på tirsdag 10. november.");
    expect(within(form).getByLabelText("Oppskrift")).toHaveValue("");
  });

  it("bruker antallet som er skrevet inn, også med komma", async () => {
    const { onAdd, user } = setup();
    const form = screen.getByRole("form", { name: "Legg til på mandag 9. november" });
    await user.selectOptions(within(form).getByLabelText("Oppskrift"), "Pannekaker");
    await user.type(within(form).getByLabelText("Personer"), "6");
    await user.click(within(form).getByRole("button", { name: "Legg til" }));
    expect(onAdd).toHaveBeenCalledWith({ recipeId: 1, day: "2026-11-09", servings: 6 });
  });

  it("viser en feil under skjemaet uten oppskrift, og når handlingen feiler", async () => {
    const onAdd = vi.fn(async () => ({ ok: false as const, message: "Noe gikk galt." }));
    const { user } = setup({ onAdd });
    const form = screen.getByRole("form", { name: "Legg til på mandag 9. november" });
    await user.click(within(form).getByRole("button", { name: "Legg til" }));
    expect(within(form).getByRole("alert")).toHaveTextContent("Velg en oppskrift først.");
    expect(within(form).getByLabelText("Oppskrift")).toHaveAttribute("aria-invalid", "true");
    expect(onAdd).not.toHaveBeenCalled();
    await user.selectOptions(within(form).getByLabelText("Oppskrift"), "Pannekaker");
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
