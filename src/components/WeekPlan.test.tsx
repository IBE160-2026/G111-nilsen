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
  const onSave = vi.fn<(input: unknown) => Promise<{ ok: true }>>(async () => ({ ok: true }));
  render(
    <WeekPlan
      days={days}
      entries={entries}
      recipes={recipes}
      shoppingHref="/handleliste?uke=2026-11-09"
      allWeeksHref="/ukemeny/uker"
      week="2026-11-09"
      onSave={onSave}
      {...overrides}
    />,
  );
  return { onSave, user: userEvent.setup() };
}

const day = (label: string) =>
  screen.getByRole("heading", { level: 2, name: new RegExp(label) }).closest("li")!;

const lastSaved = (onSave: ReturnType<typeof vi.fn>) => onSave.mock.calls.at(-1)![0];

describe("WeekPlan", () => {
  it("viser stor «Se alle uker»-knapp og at uka er lagret fra start", () => {
    setup();
    expect(screen.getByRole("link", { name: "Se alle uker" })).toHaveAttribute(
      "href",
      "/ukemeny/uker",
    );
    expect(screen.getByText("Uka er lagret.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lagre uka" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("søker etter oppskrift: skriv for å filtrere, piltaster og Enter velger og legger til i utkastet", async () => {
    const { onSave, user } = setup();
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
    // Valget legger til i utkastet; ingenting lagres før «Lagre uka».
    expect(onSave).not.toHaveBeenCalled();
    expect(within(day("mandag")).getAllByRole("link", { name: "Taco" })).toHaveLength(2);
    expect(within(form).getByRole("combobox", { name: "Oppskrift" })).toHaveValue("");
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

  it("legger til ved valg, viser «ikke lagret», og lagrer hele uka med «Lagre uka»", async () => {
    const { onSave, user } = setup();
    const form = screen.getByRole("form", { name: "Legg til på tirsdag 10. november" });
    await user.type(within(form).getByRole("combobox", { name: "Oppskrift" }), "ta");
    expect(within(form).queryByRole("button", { name: "Legg til" })).not.toBeInTheDocument();
    await user.click(within(form).getByRole("option", { name: "Taco" }));
    expect(within(day("tirsdag")).getByRole("link", { name: "Taco" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Taco er lagt på tirsdag 10. november. Husk å lagre uka.",
    );
    expect(screen.getByText("Ikke lagret ennå. Trykk «Lagre uka».")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Lagre uka" }));
    expect(lastSaved(onSave)).toEqual({
      week: "2026-11-09",
      items: [
        { recipeId: 2, day: "2026-11-09", servings: 2 },
        { recipeId: 2, day: "2026-11-10", servings: 2.5 },
      ],
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Uka er lagret.");
    expect(screen.queryByText("Ikke lagret ennå. Trykk «Lagre uka».")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lagre uka" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("bruker antallet som er skrevet inn", async () => {
    const { onSave, user } = setup();
    const form = screen.getByRole("form", { name: "Legg til på mandag 9. november" });
    await user.type(within(form).getByLabelText("Porsjoner"), "6");
    await user.type(within(form).getByRole("combobox", { name: "Oppskrift" }), "pannekaker");
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "Lagre uka" }));
    expect(lastSaved(onSave).items).toContainEqual({
      recipeId: 1,
      day: "2026-11-09",
      servings: 6,
    });
  });

  it("viser en feil under skjemaet uten oppskrift", async () => {
    const { onSave, user } = setup();
    const form = screen.getByRole("form", { name: "Legg til på mandag 9. november" });
    await user.type(within(form).getByLabelText("Porsjoner"), "3{Enter}");
    expect(within(form).getByRole("alert")).toHaveTextContent("Velg en oppskrift fra listen.");
    const box = within(form).getByRole("combobox", { name: "Oppskrift" });
    expect(box).toHaveAttribute("aria-invalid", "true");
    expect(box).toHaveAccessibleDescription("Velg en oppskrift fra listen.");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("fjerner en oppføring i utkastet og lagrer fjerningen", async () => {
    const { onSave, user } = setup();
    await user.click(screen.getByRole("button", { name: "Fjern Taco fra mandag 9. november" }));
    expect(day("mandag")).toHaveTextContent("Ingenting planlagt.");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Taco er fjernet fra mandag 9. november. Husk å lagre uka.",
    );
    expect(onSave).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Lagre uka" }));
    expect(lastSaved(onSave)).toEqual({ week: "2026-11-09", items: [] });
  });

  it("er ikke lagret igjen når en endring angres, og lagrer ingenting uten endringer", async () => {
    const { onSave, user } = setup();
    await user.click(screen.getByRole("button", { name: "Lagre uka" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Ingen endringer å lagre.");
  });

  it("viser meldingen og beholder utkastet når lagringen feiler", async () => {
    const onSave = vi.fn(async () => ({ ok: false as const, message: "Noe gikk galt." }));
    const { user } = setup({ onSave });
    await user.click(screen.getByRole("button", { name: "Fjern Taco fra mandag 9. november" }));
    await user.click(screen.getByRole("button", { name: "Lagre uka" }));
    expect(await screen.findByText("Noe gikk galt.")).toBeInTheDocument();
    expect(screen.getByText("Ikke lagret ennå. Trykk «Lagre uka».")).toBeInTheDocument();
  });

  it("stopper handlelisten mens noe er ulagret, og advarer før siden lukkes", async () => {
    const { user } = setup();
    const link = screen.getByRole("link", { name: "Lag handleliste for uka" });
    await user.click(screen.getByRole("button", { name: "Fjern Taco fra mandag 9. november" }));
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    await user.click(link);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Lagre uka først, så lages handlelisten av det som er lagret.",
    );
  });
});
