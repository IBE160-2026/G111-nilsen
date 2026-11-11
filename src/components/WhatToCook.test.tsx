// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import WhatToCook from "./WhatToCook";

afterEach(cleanup);

const recipes = [
  { id: 1, title: "Pannekaker", ingredients: ["mel", "egg", "melk"] },
  { id: 2, title: "Eggerøre", ingredients: ["egg", "smør"] },
  { id: 3, title: "Stor gryte", ingredients: ["egg", "løk", "gulrot", "kjøttdeig"] },
  { id: 4, title: "Ingen treff", ingredients: ["fisk"] },
];
const pantry = [
  { id: 1, name: "egg" },
  { id: 2, name: "smør" },
];

const noop = () => ({ add: vi.fn(), remove: vi.fn() });

describe("WhatToCook", () => {
  it("uten noe hjemme: en hjelpetekst og ingen oppskrifter", () => {
    const { add, remove } = noop();
    render(<WhatToCook recipes={recipes} pantry={[]} onAddPantry={add} onRemovePantry={remove} />);
    expect(
      screen.getByText("Legg til noe du har hjemme, så dukker oppskriftene opp her."),
    ).toBeInTheDocument();
    expect(screen.getByText("Ingenting ennå.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("grupperer: kan lages nå, mangler 1–2 ting og mangler flere, og viser hva som mangler", () => {
    const { add, remove } = noop();
    render(
      <WhatToCook recipes={recipes} pantry={pantry} onAddPantry={add} onRemovePantry={remove} />,
    );
    expect(screen.getByText("3 oppskrifter passer")).toBeInTheDocument();
    const ready = screen.getByRole("region", { name: "Kan lages nå" });
    expect(within(ready).getByRole("heading", { level: 3, name: "Eggerøre" })).toBeInTheDocument();
    expect(ready).toHaveTextContent("Har 2 av 2");
    expect(ready).toHaveTextContent("Du har alt du trenger.");
    expect(within(ready).getByRole("link")).toHaveAttribute("href", "/oppskrift/2");

    const few = screen.getByRole("region", { name: "Mangler 1–2 ting" });
    expect(few).toHaveTextContent("Pannekaker");
    expect(few).toHaveTextContent("Har 1 av 3");
    expect(few).toHaveTextContent("Mangler: mel, melk");

    const more = screen.getByRole("region", { name: "Mangler flere ting" });
    expect(more).toHaveTextContent("Stor gryte");
    expect(more).toHaveTextContent("Mangler: løk, gulrot, kjøttdeig");
    expect(screen.queryByText("Ingen treff")).not.toBeInTheDocument();
  });

  it("når ingenting passer, sier den det", () => {
    const { add, remove } = noop();
    render(
      <WhatToCook
        recipes={recipes}
        pantry={[{ id: 9, name: "sjokolade" }]}
        onAddPantry={add}
        onRemovePantry={remove}
      />,
    );
    expect(
      screen.getByRole("heading", {
        name: "Ingen av oppskriftene dine bruker det du har hjemme ennå.",
      }),
    ).toBeInTheDocument();
  });

  it("legger til noe hjemme, tømmer feltet og oppdaterer treffene med en gang", async () => {
    const user = userEvent.setup();
    const add = vi.fn().mockResolvedValue({ ok: true, item: { id: 3, name: "melk" } });
    render(
      <WhatToCook recipes={recipes} pantry={pantry} onAddPantry={add} onRemovePantry={vi.fn()} />,
    );
    await user.type(screen.getByLabelText("Legg til noe du har hjemme"), "melk{Enter}");
    expect(add).toHaveBeenCalledWith("melk");
    expect(await screen.findByText("melk er lagt til.")).toBeInTheDocument();
    expect(screen.getByLabelText("Legg til noe du har hjemme")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Fjern melk" })).toBeInTheDocument();
    const few = screen.getByRole("region", { name: "Mangler 1–2 ting" });
    expect(few).toHaveTextContent("Har 2 av 3");
    expect(few).toHaveTextContent("Mangler: mel");
  });

  it("viser meldingen fra handlingen under feltet og beholder teksten", async () => {
    const user = userEvent.setup();
    const add = vi
      .fn()
      .mockResolvedValue({ ok: false, field: "name", message: "Skriv hva du har hjemme." });
    render(
      <WhatToCook recipes={recipes} pantry={pantry} onAddPantry={add} onRemovePantry={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: "Legg til" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Skriv hva du har hjemme.");
    expect(screen.getByLabelText("Legg til noe du har hjemme")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("fjerner noe hjemme og oppdaterer treffene", async () => {
    const user = userEvent.setup();
    const remove = vi.fn().mockResolvedValue({ ok: true });
    render(
      <WhatToCook
        recipes={recipes}
        pantry={pantry}
        onAddPantry={vi.fn()}
        onRemovePantry={remove}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Fjern smør" }));
    expect(remove).toHaveBeenCalledWith(2);
    expect(await screen.findByText("smør er fjernet.")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Kan lages nå" })).not.toBeInTheDocument();
  });

  it("en feil ved fjerning viser meldingen og beholder listen", async () => {
    const user = userEvent.setup();
    const remove = vi.fn().mockResolvedValue({ ok: false, message: "Noe gikk galt." });
    render(
      <WhatToCook
        recipes={recipes}
        pantry={pantry}
        onAddPantry={vi.fn()}
        onRemovePantry={remove}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Fjern smør" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Noe gikk galt.");
    expect(screen.getByRole("button", { name: "Fjern smør" })).toBeInTheDocument();
  });

  it("et kast gir en vanlig feilmelding", async () => {
    const user = userEvent.setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <WhatToCook
        recipes={recipes}
        pantry={pantry}
        onAddPantry={vi.fn().mockRejectedValue(new Error("x"))}
        onRemovePantry={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText("Legg til noe du har hjemme"), "melk{Enter}");
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("følger listen fra serveren når den endres, og beholder meldingen", async () => {
    const user = userEvent.setup();
    const add = vi.fn().mockResolvedValue({ ok: true, item: { id: 3, name: "melk" } });
    const { rerender } = render(
      <WhatToCook recipes={recipes} pantry={pantry} onAddPantry={add} onRemovePantry={vi.fn()} />,
    );
    await user.type(screen.getByLabelText("Legg til noe du har hjemme"), "melk{Enter}");
    await screen.findByText("melk er lagt til.");
    rerender(
      <WhatToCook
        recipes={recipes}
        pantry={[{ id: 7, name: "mel" }]}
        onAddPantry={add}
        onRemovePantry={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Fjern mel" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Fjern melk" })).not.toBeInTheDocument();
    expect(screen.getByText("melk er lagt til.")).toBeInTheDocument();
  });
});
