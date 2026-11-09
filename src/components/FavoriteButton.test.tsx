// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FavoriteButton from "./FavoriteButton";
import FavoriteFeedback, { FAVORITE_MESSAGE_MS } from "./FavoriteFeedback";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const heart = () => screen.getByRole("button", { name: "Favoritt: Pannekaker" });

type Deferred = { resolve: (value: unknown) => void; promise: Promise<unknown> };
function deferred(): Deferred {
  let resolve!: (value: unknown) => void;
  const promise = new Promise((r) => (resolve = r));
  return { resolve, promise };
}

function setup(
  props: Partial<React.ComponentProps<typeof FavoriteButton>> = {},
  onSetFavorite = vi.fn().mockResolvedValue({ ok: true }),
) {
  const view = render(
    <FavoriteButton
      title="Pannekaker"
      isFavorite={false}
      onSetFavorite={onSetFavorite}
      {...props}
    />,
  );
  return { onSetFavorite, ...view };
}

describe("FavoriteButton: utseende og tilgjengelighet", () => {
  it("er en <button type=button> med aria-pressed og stabil etikett som nevner oppskriften", () => {
    setup();
    expect(heart().tagName).toBe("BUTTON");
    expect(heart()).toHaveAttribute("type", "button");
    expect(heart()).toHaveAttribute("aria-pressed", "false");
  });

  it.each([
    [false, "none"],
    [true, "currentColor"],
  ])("isFavorite=%s: aria-pressed og hjerteformen (fylt eller omriss)", (isFavorite, fill) => {
    setup({ isFavorite });
    expect(heart()).toHaveAttribute("aria-pressed", String(isFavorite));
    const svg = heart().querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
    expect(svg.querySelector("path")).toHaveAttribute("fill", fill);
    expect(svg.querySelector("path")).toHaveAttribute("stroke", "currentColor");
  });

  it("etiketten skifter ikke mellom «legg til» og «fjern» (aria-pressed sier tilstanden)", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(heart());
    expect(heart()).toHaveAttribute("aria-pressed", "true");
    expect(heart()).toHaveAccessibleName("Favoritt: Pannekaker");
  });

  it("tar imot ekstra klasse og kan nås med Tab", async () => {
    const user = userEvent.setup();
    setup({ className: "ekstra" });
    expect(heart()).toHaveClass("ekstra");
    await user.tab();
    expect(heart()).toHaveFocus();
  });
});

describe("FavoriteButton: trykk", () => {
  it("kaller onSetFavorite med eksplisitt verdi, ikke «bytt»", async () => {
    const user = userEvent.setup();
    const { onSetFavorite } = setup();
    await user.click(heart());
    expect(onSetFavorite).toHaveBeenCalledExactlyOnceWith(true);
    await user.click(heart());
    expect(onSetFavorite).toHaveBeenLastCalledWith(false);
    expect(heart()).toHaveAttribute("aria-pressed", "false");
  });

  it("virker med Enter og mellomrom", async () => {
    const user = userEvent.setup();
    const { onSetFavorite } = setup();
    await user.tab();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onSetFavorite.mock.calls).toEqual([[true], [false]]);
  });

  it("hjertet skifter umiddelbart (optimistisk), før serveren har svart", async () => {
    const user = userEvent.setup();
    const pending = deferred();
    const { onSetFavorite } = setup(
      {},
      vi.fn(() => pending.promise),
    );
    await user.click(heart());
    expect(heart()).toHaveAttribute("aria-pressed", "true");
    expect(onSetFavorite).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve({ ok: true }));
    expect(heart()).toHaveAttribute("aria-pressed", "true");
  });

  it("feil: rulles tilbake og meldingen vises under hjertet (role=alert)", async () => {
    const user = userEvent.setup();
    setup({}, vi.fn().mockResolvedValue({ ok: false, message: "Vi fant ikke oppskriften." }));
    await user.click(heart());
    expect(await screen.findByRole("alert")).toHaveTextContent("Vi fant ikke oppskriften.");
    expect(heart()).toHaveAttribute("aria-pressed", "false");
  });

  it("feil: meldingen forsvinner ved neste trykk", async () => {
    const user = userEvent.setup();
    const onSetFavorite = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, message: "Noe gikk galt." })
      .mockResolvedValue({ ok: true });
    setup({}, onSetFavorite);
    await user.click(heart());
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await user.click(heart());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(heart()).toHaveAttribute("aria-pressed", "true");
  });

  it("kall som kaster: rulles tilbake med reservemelding, og feilen logges", async () => {
    const user = userEvent.setup();
    setup({ isFavorite: true }, vi.fn().mockRejectedValue(new Error("nett")));
    await user.click(heart());
    expect(await screen.findByRole("alert")).toHaveTextContent("Noe gikk galt.");
    expect(heart()).toHaveAttribute("aria-pressed", "true");
    expect(console.error).toHaveBeenCalled();
  });

  it("onResult får utfallet, og knappen viser da ikke selv en feilmelding", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    const onSetFavorite = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, message: "Feil." });
    setup({ onResult }, onSetFavorite);
    await user.click(heart());
    expect(onResult).toHaveBeenLastCalledWith({ ok: true, isFavorite: true });
    await user.click(heart());
    expect(onResult).toHaveBeenLastCalledWith({ ok: false, message: "Feil." });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(heart()).toHaveAttribute("aria-pressed", "true");
  });
});

describe("FavoriteButton: raske trykk (ingen kappløp, siste ønske vinner)", () => {
  it("to trykk mens første kall pågår: kallene sendes ett om gangen, og sluttilstanden er siste trykk", async () => {
    const user = userEvent.setup();
    const first = deferred();
    const second = deferred();
    const onSetFavorite = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    setup({}, onSetFavorite);

    await user.click(heart());
    await user.click(heart());
    // Hjertet viser siste ønske med en gang, men bare ett kall er på vei til serveren.
    expect(heart()).toHaveAttribute("aria-pressed", "false");
    expect(onSetFavorite.mock.calls).toEqual([[true]]);

    await act(async () => first.resolve({ ok: true }));
    expect(onSetFavorite.mock.calls).toEqual([[true], [false]]);
    expect(heart()).toHaveAttribute("aria-pressed", "false");

    await act(async () => second.resolve({ ok: true }));
    expect(heart()).toHaveAttribute("aria-pressed", "false");
  });

  it("tre trykk: kallene kommer i rekkefølge, og siste verdi vinner", async () => {
    const user = userEvent.setup();
    const gates = [deferred(), deferred(), deferred()];
    const onSetFavorite = vi.fn();
    gates.forEach((gate) => onSetFavorite.mockReturnValueOnce(gate.promise));
    setup({}, onSetFavorite);
    await user.click(heart());
    await user.click(heart());
    await user.click(heart());
    expect(heart()).toHaveAttribute("aria-pressed", "true");
    for (const gate of gates) await act(async () => gate.resolve({ ok: true }));
    expect(onSetFavorite.mock.calls).toEqual([[true], [false], [true]]);
    expect(heart()).toHaveAttribute("aria-pressed", "true");
  });

  it("første kall feiler, andre lykkes: sluttilstanden er siste trykk", async () => {
    const user = userEvent.setup();
    const first = deferred();
    const onSetFavorite = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue({ ok: true });
    setup({ isFavorite: true }, onSetFavorite);
    await user.click(heart()); // ønsker false
    await user.click(heart()); // ønsker true igjen
    await act(async () => first.resolve({ ok: false, message: "Feil." }));
    expect(onSetFavorite.mock.calls).toEqual([[false], [true]]);
    expect(heart()).toHaveAttribute("aria-pressed", "true");
  });
});

describe("FavoriteButton: meldinger ved raske trykk", () => {
  it("første trykk feiler og andre lykkes uten endring: ingen feil og ingen «Fjernet»-melding", async () => {
    const user = userEvent.setup();
    const first = deferred();
    const onSetFavorite = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue({ ok: true });
    const onResult = vi.fn();
    setup({ onResult }, onSetFavorite);
    await user.click(heart()); // ønsker true (feiler)
    await user.click(heart()); // ønsker false (lykkes)
    await act(async () => first.resolve({ ok: false, message: "Feil." }));
    expect(onResult).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(heart()).toHaveAttribute("aria-pressed", "false");
  });

  it("første lykkes og andre feiler: hjertet viser det serveren har, og feilen meldes", async () => {
    const user = userEvent.setup();
    const onSetFavorite = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, message: "Feil." });
    const onResult = vi.fn();
    setup({ onResult }, onSetFavorite);
    await user.click(heart());
    await user.click(heart());
    await waitFor(() => expect(onResult).toHaveBeenCalledTimes(2));
    expect(onResult.mock.calls[1][0]).toEqual({ ok: false, message: "Feil." });
    expect(heart()).toHaveAttribute("aria-pressed", "true");
  });
});

describe("FavoriteButton: følger serveren", () => {
  it("ny isFavorite utenfra (revalidering) oppdaterer hjertet", () => {
    const { rerender, onSetFavorite } = setup();
    rerender(<FavoriteButton title="Pannekaker" isFavorite onSetFavorite={onSetFavorite} />);
    expect(heart()).toHaveAttribute("aria-pressed", "true");
    rerender(
      <FavoriteButton title="Pannekaker" isFavorite={false} onSetFavorite={onSetFavorite} />,
    );
    expect(heart()).toHaveAttribute("aria-pressed", "false");
  });

  it("etter et lagret trykk og ny verdi fra serveren stemmer hjertet med serveren", async () => {
    const user = userEvent.setup();
    const { rerender, onSetFavorite } = setup();
    await user.click(heart());
    rerender(<FavoriteButton title="Pannekaker" isFavorite onSetFavorite={onSetFavorite} />);
    expect(heart()).toHaveAttribute("aria-pressed", "true");
  });

  it("en skjult side (Activity) som får ny verdi viser den riktige når den vises igjen", () => {
    const onSetFavorite = vi.fn();
    const page = (mode: "visible" | "hidden", isFavorite: boolean) => (
      <Activity mode={mode}>
        <FavoriteButton title="Pannekaker" isFavorite={isFavorite} onSetFavorite={onSetFavorite} />
      </Activity>
    );
    const { rerender } = render(page("visible", false));
    rerender(page("hidden", false));
    rerender(page("hidden", true));
    rerender(page("visible", true));
    expect(heart()).toHaveAttribute("aria-pressed", "true");
  });
});

describe("FavoriteFeedback (Favoritter-siden)", () => {
  function list(favorite: boolean) {
    return (
      <FavoriteFeedback headingId="overskrift">
        <h1 id="overskrift" tabIndex={-1}>
          Favoritter
        </h1>
        {favorite ? (
          <FavoriteButton
            title="Pannekaker"
            isFavorite
            onSetFavorite={vi.fn().mockResolvedValue({ ok: true })}
          />
        ) : (
          <p>Ingen</p>
        )}
      </FavoriteFeedback>
    );
  }

  it("har et tomt statusområde i DOM fra start", () => {
    render(list(true));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("sier «Fjernet fra favoritter.» og «Lagt til i favoritter.» i 3 sekunder", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(list(true));
    await user.click(heart());
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Fjernet fra favoritter."),
    );
    await user.click(heart());
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Lagt til i favoritter."),
    );
    act(() => {
      vi.advanceTimersByTime(FAVORITE_MESSAGE_MS - 1000);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Lagt til i favoritter.");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("meldingen overlever at kortet (og hjertet) fjernes", async () => {
    const user = userEvent.setup();
    const { rerender } = render(list(true));
    await user.click(heart());
    rerender(list(false));
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Fjernet fra favoritter.");
  });

  it("fokus flyttes til overskriften når hjertet som hadde fokus fjernes", async () => {
    const user = userEvent.setup();
    const { rerender } = render(list(true));
    await user.click(heart());
    expect(heart()).toHaveFocus();
    rerender(list(false));
    expect(screen.getByRole("heading", { name: "Favoritter" })).toHaveFocus();
  });

  it("fokus flyttes ikke når hjertet ikke hadde fokus", () => {
    const { rerender } = render(list(true));
    rerender(list(false));
    expect(screen.getByRole("heading", { name: "Favoritter" })).not.toHaveFocus();
  });

  it("uten FavoriteFeedback rundt virker knappen likevel (Samlingen og mapper)", async () => {
    const user = userEvent.setup();
    const { unmount } = setup();
    await user.click(heart());
    expect(() => unmount()).not.toThrow();
  });
});

describe("CSS: tokens, trykkflate, fokus og forced-colors", () => {
  const read = (file: string) => readFileSync(join(process.cwd(), "src/components", file), "utf8");

  it("FavoriteButton.module.css bruker tokens, 44 px trykkflate, fokusring og forced-colors", () => {
    const css = read("FavoriteButton.module.css");
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/\d\s*px\b/);
    expect(css).toContain("var(--tap-target-min)");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("var(--color-accent)");
    expect(css).toContain("forced-colors: active");
  });

  it("RecipeCard.module.css reserverer plass til hjertet og plasserer det øverst til høyre", () => {
    const css = read("RecipeCard.module.css");
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).toMatch(/padding-inline-end:\s*calc\(var\(--tap-target-min\)/);
    expect(css).toMatch(/\.favorite\s*\{[^}]*position:\s*absolute/);
  });
});
