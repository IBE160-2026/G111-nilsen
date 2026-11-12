// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  ActionResult,
  ApplySuggestionActionResult,
  SuggestionsActionResult,
} from "@/app/_shared/action-result";
import type { AppliedSuggestion, Suggestion } from "@/domain";
import { messageFor, suggestionMessages } from "@/lib/messages";
import SuggestionsSection from "./SuggestionsSection";

afterEach(cleanup);

const suggestions = [
  { text: "Tilsett sitron.", reason: "Gir friskhet.", appliesTo: "recipe" as const },
  { text: "La stå litt.", reason: "Smakene setter seg.", appliesTo: "steps" as const },
];

const success = (isExample: boolean): SuggestionsActionResult => ({
  ok: true,
  suggestions,
  isExample,
});

/** Et kall vi bestemmer når svarer. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

type Overrides = {
  onRequest?: () => Promise<SuggestionsActionResult>;
  applied?: AppliedSuggestion[];
  onApply?: (s: Suggestion) => Promise<ApplySuggestionActionResult>;
  onRemove?: (id: number) => Promise<ActionResult>;
};

function setup(overrides: Overrides = {}) {
  const onRequest = vi.fn(overrides.onRequest ?? (async () => success(true)));
  const onApply = vi.fn(
    overrides.onApply ??
      (async (s: Suggestion): Promise<ApplySuggestionActionResult> => ({
        ok: true,
        suggestion: { id: 11, ...s },
      })),
  );
  const onRemove = vi.fn(overrides.onRemove ?? (async (): Promise<ActionResult> => ({ ok: true })));
  const user = userEvent.setup();
  render(
    <SuggestionsSection
      onRequest={onRequest}
      applied={overrides.applied ?? []}
      onApply={onApply}
      onRemove={onRemove}
    />,
  );
  return { user, onRequest, onApply, onRemove };
}

const requestButton = () => screen.getByRole("button", { name: suggestionMessages.request });
const heading = () => screen.getByRole("heading", { level: 2, name: suggestionMessages.heading });
const status = () => screen.getByRole("status");
const failure = messageFor("suggestion_failed");
const chosenGroup = () => screen.queryByRole("group", { name: suggestionMessages.chosenHeading });

describe("SuggestionsSection: hente forslag (Story 4.1)", () => {
  it("i hvile: overskrift, forklaring og «Få forslag», uten forslag eller feil", () => {
    setup();
    const section = screen.getByRole("region", { name: "Forslag" });
    expect(within(section).getByText(suggestionMessages.lead)).toBeInTheDocument();
    expect(requestButton()).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    // Statusfeltet er med fra start (så oppleses teksten), men er tomt.
    expect(status()).toBeEmptyDOMElement();
    expect(chosenGroup()).not.toBeInTheDocument();
    expect(screen.queryByText(suggestionMessages.exampleLabel)).not.toBeInTheDocument();
  });

  it("under henting: «Lager forslag …», plassholdere skjult for skjermleser, knappen beholder fokus", async () => {
    const pending = deferred<SuggestionsActionResult>();
    const { user } = setup({ onRequest: () => pending.promise });

    await user.click(requestButton());

    expect(status()).toHaveTextContent("Lager forslag …");
    expect(requestButton()).toHaveAttribute("aria-disabled", "true");
    expect(requestButton()).toHaveFocus();
    const placeholders = document.querySelector("ul[aria-hidden='true']");
    expect(placeholders?.querySelectorAll("li")).toHaveLength(3);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();

    await act(async () => pending.resolve(success(true)));
    expect(status()).toBeEmptyDOMElement();
    expect(screen.getByRole("group", { name: suggestionMessages.resultsHeading })).toBeVisible();
  });

  it("dobbeltklikk gir ett kall", async () => {
    const pending = deferred<SuggestionsActionResult>();
    const { user, onRequest } = setup({ onRequest: () => pending.promise });

    await user.dblClick(requestButton());
    await user.click(requestButton());
    expect(onRequest).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve(success(true)));
  });

  it("eksempelforslag: merket og forklaringen, forslag med begrunnelse, fokus på gruppen, ingen «Få forslag»", async () => {
    const { user } = setup();

    await user.click(requestButton());

    const group = await screen.findByRole("group", { name: suggestionMessages.resultsHeading });
    expect(group).toHaveFocus();
    expect(screen.getByText(suggestionMessages.exampleLabel)).toBeInTheDocument();
    expect(screen.getByText(suggestionMessages.exampleNote)).toBeInTheDocument();
    const items = within(within(group).getByRole("list")).getAllByRole("listitem");
    expect(items.map((li) => [...li.querySelectorAll("p")].map((p) => p.textContent))).toEqual([
      ["Tilsett sitron.", "Gir friskhet."],
      ["La stå litt.", "Smakene setter seg."],
    ]);
    expect(
      screen.queryByRole("button", { name: suggestionMessages.request }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("når språkmodellen er opptatt står det, i stedet for forklaringen om å koble til (Story 6.25b)", async () => {
    const { user } = setup({ onRequest: async () => ({ ...success(true), busy: true }) });
    await user.click(screen.getByRole("button", { name: suggestionMessages.request }));
    expect(await screen.findByText(suggestionMessages.busyNote)).toBeInTheDocument();
    expect(screen.queryByText(suggestionMessages.exampleNote)).not.toBeInTheDocument();
  });

  it("forslag som ikke er eksempler får ikke merket", async () => {
    const { user } = setup({ onRequest: async () => success(false) });
    await user.click(requestButton());
    expect(await screen.findByText("Tilsett sitron.")).toBeInTheDocument();
    expect(screen.queryByText(suggestionMessages.exampleLabel)).not.toBeInTheDocument();
    expect(screen.queryByText(suggestionMessages.exampleNote)).not.toBeInTheDocument();
  });

  it("feil: meldingen i et varsel, «Prøv igjen» med fokus, og et nytt forsøk kan lykkes", async () => {
    const onRequest = vi
      .fn<() => Promise<SuggestionsActionResult>>()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce(success(true));
    const { user } = setup({ onRequest });

    await user.click(requestButton());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(failure.title);
    expect(alert).toHaveTextContent(failure.body);
    expect(failure.title).toBe("Fikk ikke laget forslag akkurat nå.");
    expect(failure.body).toBe("Prøv igjen senere.");
    expect(status()).toBeEmptyDOMElement();
    const retry = screen.getByRole("button", { name: suggestionMessages.retry });
    expect(retry).toHaveAttribute("aria-disabled", "false");

    await user.click(retry);

    expect(await screen.findByText("Tilsett sitron.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onRequest).toHaveBeenCalledTimes(2);
  });

  it("et kall som avvises gir samme melding i stedet for å krasje", async () => {
    const { user } = setup({ onRequest: async () => Promise.reject(new Error("nettverk borte")) });

    await user.click(requestButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(failure.title);
    expect(screen.getByRole("button", { name: suggestionMessages.retry })).toBeInTheDocument();
  });

  it("feilmeldingen forsvinner mens et nytt forsøk pågår", async () => {
    const pending = deferred<SuggestionsActionResult>();
    const onRequest = vi
      .fn<() => Promise<SuggestionsActionResult>>()
      .mockResolvedValueOnce({ ok: false })
      .mockReturnValueOnce(pending.promise);
    const { user } = setup({ onRequest });

    await user.click(requestButton());
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: suggestionMessages.retry }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(status()).toHaveTextContent("Lager forslag …");
    await act(async () => pending.resolve(success(true)));
  });
});

describe("SuggestionsSection: ta i bruk, hoppe over og fjerne (Story 4.2)", () => {
  const applied: AppliedSuggestion[] = [
    { id: 5, text: "Server med salat.", reason: "Gir kontrast.", appliesTo: "recipe" },
  ];

  it("viser valgte forslag fra start, med «Tatt i bruk» og «Fjern», også uten å hente nye", () => {
    setup({ applied });
    const group = chosenGroup();
    expect(group).toBeInTheDocument();
    const item = within(group!).getByRole("listitem");
    expect(item).toHaveTextContent("Server med salat.");
    expect(item).toHaveTextContent("Gir kontrast.");
    expect(within(item).getByText("Tatt i bruk")).toBeInTheDocument();
    expect(within(item).getByRole("button", { name: "Fjern: Server med salat." })).toBeVisible();
    expect(requestButton()).toBeInTheDocument();
  });

  it("ta i bruk: kaller handlingen med forslaget, flytter det til valgte, melder fra og flytter fokus til overskriften", async () => {
    const { user, onApply } = setup();
    await user.click(requestButton());
    await screen.findByRole("group", { name: suggestionMessages.resultsHeading });

    await user.click(screen.getByRole("button", { name: "Ta i bruk: Tilsett sitron." }));

    expect(onApply).toHaveBeenCalledExactlyOnceWith(suggestions[0]);
    const group = await screen.findByRole("group", { name: suggestionMessages.chosenHeading });
    expect(within(group).getByText("Tilsett sitron.")).toBeInTheDocument();
    expect(within(group).getByText("Tatt i bruk")).toBeInTheDocument();
    // Ikke lenger blant de nye forslagene.
    expect(screen.queryByRole("button", { name: "Ta i bruk: Tilsett sitron." })).toBeNull();
    expect(screen.getByRole("button", { name: "Ta i bruk: La stå litt." })).toBeInTheDocument();
    expect(status()).toHaveTextContent(suggestionMessages.appliedStatus);
    expect(heading()).toHaveFocus();
  });

  it("hopp over: skjuler forslaget uten å kalle noe, melder fra, og viser en melding når alle er håndtert", async () => {
    const { user, onApply, onRemove } = setup();
    await user.click(requestButton());
    await screen.findByRole("group", { name: suggestionMessages.resultsHeading });

    await user.click(screen.getByRole("button", { name: "Hopp over: Tilsett sitron." }));

    expect(screen.queryByText("Tilsett sitron.")).not.toBeInTheDocument();
    expect(screen.getByText("La stå litt.")).toBeInTheDocument();
    expect(status()).toHaveTextContent(suggestionMessages.skippedStatus);
    expect(heading()).toHaveFocus();
    expect(chosenGroup()).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Hopp over: La stå litt." }));

    expect(screen.getByText(suggestionMessages.allHandled)).toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();
  });

  it("alle tatt i bruk eller hoppet over: «Du har tatt stilling til alle forslagene.»", async () => {
    const { user } = setup();
    await user.click(requestButton());
    await screen.findByRole("group", { name: suggestionMessages.resultsHeading });

    await user.click(screen.getByRole("button", { name: "Ta i bruk: Tilsett sitron." }));
    await user.click(screen.getByRole("button", { name: "Hopp over: La stå litt." }));

    expect(screen.getByText(suggestionMessages.allHandled)).toBeInTheDocument();
    expect(within(chosenGroup()!).getAllByRole("listitem")).toHaveLength(1);
  });

  it("fjern: kaller handlingen med id, fjerner forslaget, melder fra og flytter fokus til overskriften", async () => {
    const { user, onRemove } = setup({ applied });

    await user.click(screen.getByRole("button", { name: "Fjern: Server med salat." }));

    expect(onRemove).toHaveBeenCalledExactlyOnceWith(5);
    await act(async () => {});
    expect(chosenGroup()).not.toBeInTheDocument();
    expect(screen.queryByText("Server med salat.")).not.toBeInTheDocument();
    expect(status()).toHaveTextContent(suggestionMessages.removedStatus);
    expect(heading()).toHaveFocus();
  });

  it("et hentet forslag som allerede er valgt, vises ikke som nytt", async () => {
    const { user } = setup({
      applied: [{ id: 9, ...suggestions[0] }],
    });
    await user.click(requestButton());
    await screen.findByRole("group", { name: suggestionMessages.resultsHeading });

    expect(screen.queryByRole("button", { name: "Ta i bruk: Tilsett sitron." })).toBeNull();
    expect(screen.getByRole("button", { name: "Ta i bruk: La stå litt." })).toBeInTheDocument();
    expect(within(chosenGroup()!).getAllByRole("listitem")).toHaveLength(1);
  });

  it("ta i bruk som feiler: meldingen i statusfeltet, forslaget blir stående og kan prøves igjen", async () => {
    const onApply = vi
      .fn<Overrides["onApply"] & object>()
      .mockResolvedValueOnce({ ok: false, message: "Vi fant ikke oppskriften. Prøv igjen." })
      .mockResolvedValueOnce({ ok: true, suggestion: { id: 12, ...suggestions[0] } });
    const { user } = setup({ onApply });
    await user.click(requestButton());
    await screen.findByRole("group", { name: suggestionMessages.resultsHeading });
    const button = () => screen.getByRole("button", { name: "Ta i bruk: Tilsett sitron." });

    await user.click(button());

    expect(status()).toHaveTextContent("Vi fant ikke oppskriften. Prøv igjen.");
    expect(chosenGroup()).not.toBeInTheDocument();
    expect(button()).toHaveAttribute("aria-disabled", "false");

    await user.click(button());

    expect(within(chosenGroup()!).getByText("Tilsett sitron.")).toBeInTheDocument();
    expect(status()).toHaveTextContent(suggestionMessages.appliedStatus);
  });

  it("et kall som avvises (ta i bruk eller fjern) gir reservemeldingen, og forslaget blir stående", async () => {
    const { user } = setup({
      applied,
      onApply: async () => Promise.reject(new Error("nettverk borte")),
      onRemove: async () => Promise.reject(new Error("nettverk borte")),
    });
    await user.click(screen.getByRole("button", { name: "Fjern: Server med salat." }));
    expect(status()).toHaveTextContent(messageFor(undefined).title);
    expect(screen.getByText("Server med salat.")).toBeInTheDocument();

    await user.click(requestButton());
    await screen.findByRole("group", { name: suggestionMessages.resultsHeading });
    await user.click(screen.getByRole("button", { name: "Ta i bruk: Tilsett sitron." }));
    expect(status()).toHaveTextContent(messageFor(undefined).title);
    expect(screen.getByRole("button", { name: "Ta i bruk: Tilsett sitron." })).toBeInTheDocument();
  });

  it("fjern som feiler: forslaget blir stående med meldingen", async () => {
    const { user } = setup({
      applied,
      onRemove: async () => ({ ok: false, message: "Vi fant ikke oppskriften. Prøv igjen." }),
    });
    await user.click(screen.getByRole("button", { name: "Fjern: Server med salat." }));
    expect(screen.getByText("Server med salat.")).toBeInTheDocument();
    expect(status()).toHaveTextContent("Vi fant ikke oppskriften. Prøv igjen.");
  });

  it("dobbeltklikk på «Ta i bruk» og «Fjern» gir ett kall hver", async () => {
    const pendingApply = deferred<ApplySuggestionActionResult>();
    const pendingRemove = deferred<ActionResult>();
    const { user, onApply, onRemove } = setup({
      applied,
      onApply: () => pendingApply.promise,
      onRemove: () => pendingRemove.promise,
    });

    await user.dblClick(screen.getByRole("button", { name: "Fjern: Server med salat." }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Fjern: Server med salat." })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await act(async () => pendingRemove.resolve({ ok: true }));

    await user.click(requestButton());
    await screen.findByRole("group", { name: suggestionMessages.resultsHeading });
    await user.dblClick(screen.getByRole("button", { name: "Ta i bruk: Tilsett sitron." }));
    expect(onApply).toHaveBeenCalledTimes(1);
    await act(async () =>
      pendingApply.resolve({ ok: true, suggestion: { id: 3, ...suggestions[0] } }),
    );
    expect(within(chosenGroup()!).getAllByRole("listitem")).toHaveLength(1);
  });

  it("samme forslag to ganger fra handlingen (samme id) gir én rad", async () => {
    const { user } = setup({
      applied: [{ id: 11, ...suggestions[0] }],
      onApply: async (s) => ({ ok: true, suggestion: { id: 11, ...s } }),
      onRequest: async () => ({
        ok: true,
        isExample: false,
        suggestions: [{ ...suggestions[1] }],
      }),
    });
    await user.click(requestButton());
    await screen.findByRole("group", { name: suggestionMessages.resultsHeading });
    await user.click(screen.getByRole("button", { name: "Ta i bruk: La stå litt." }));
    // id 11 finnes fra før: ingen dublett.
    expect(within(chosenGroup()!).getAllByRole("listitem")).toHaveLength(1);
  });
});
