// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SuggestionsActionResult } from "@/app/_shared/action-result";
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
function deferred() {
  let resolve!: (value: SuggestionsActionResult) => void;
  const promise = new Promise<SuggestionsActionResult>((r) => (resolve = r));
  return { promise, resolve };
}

const requestButton = () => screen.getByRole("button", { name: suggestionMessages.request });
const failure = messageFor("suggestion_failed");

describe("SuggestionsSection", () => {
  it("i hvile: overskrift, forklaring og «Få forslag», uten forslag eller feil", () => {
    render(<SuggestionsSection onRequest={vi.fn()} />);
    const section = screen.getByRole("region", { name: "Forslag" });
    expect(within(section).getByText(suggestionMessages.lead)).toBeInTheDocument();
    expect(requestButton()).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    // Statusfeltet er med fra start (så oppleses teksten), men er tomt.
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.queryByText(suggestionMessages.exampleLabel)).not.toBeInTheDocument();
  });

  it("under henting: «Lager forslag …», plassholdere skjult for skjermleser, knappen beholder fokus", async () => {
    const pending = deferred();
    const onRequest = vi.fn(() => pending.promise);
    const user = userEvent.setup();
    render(<SuggestionsSection onRequest={onRequest} />);

    await user.click(requestButton());

    expect(screen.getByRole("status")).toHaveTextContent("Lager forslag …");
    expect(requestButton()).toHaveAttribute("aria-disabled", "true");
    expect(requestButton()).toHaveFocus();
    const placeholders = document.querySelector("ul[aria-hidden='true']");
    expect(placeholders?.querySelectorAll("li")).toHaveLength(3);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();

    // Når forslagene er hentet, tar de over, og statusfeltet er borte.
    await act(async () => pending.resolve(success(true)));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: suggestionMessages.resultsHeading })).toBeVisible();
  });

  it("dobbeltklikk gir ett kall", async () => {
    const pending = deferred();
    const onRequest = vi.fn(() => pending.promise);
    const user = userEvent.setup();
    render(<SuggestionsSection onRequest={onRequest} />);

    await user.dblClick(requestButton());
    await user.click(requestButton());
    expect(onRequest).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve(success(true)));
  });

  it("eksempelforslag: merket «Eksempelforslag» og forklaringen, forslag med begrunnelse, fokus på gruppen, ingen knapp", async () => {
    const user = userEvent.setup();
    render(<SuggestionsSection onRequest={vi.fn().mockResolvedValue(success(true))} />);

    await user.click(requestButton());

    const group = await screen.findByRole("group", { name: suggestionMessages.resultsHeading });
    expect(group).toHaveFocus();
    expect(screen.getByText(suggestionMessages.exampleLabel)).toBeInTheDocument();
    expect(screen.getByText(suggestionMessages.exampleNote)).toBeInTheDocument();
    const items = within(within(group).getByRole("list")).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      "Tilsett sitron.Gir friskhet.",
      "La stå litt.Smakene setter seg.",
    ]);
    expect(
      screen.queryByRole("button", { name: suggestionMessages.request }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("forslag som ikke er eksempler får ikke merket", async () => {
    const user = userEvent.setup();
    render(<SuggestionsSection onRequest={vi.fn().mockResolvedValue(success(false))} />);
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
    const user = userEvent.setup();
    render(<SuggestionsSection onRequest={onRequest} />);

    await user.click(requestButton());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(failure.title);
    expect(alert).toHaveTextContent(failure.body);
    expect(failure.title).toBe("Fikk ikke laget forslag akkurat nå.");
    expect(failure.body).toBe("Prøv igjen senere.");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    const retry = screen.getByRole("button", { name: suggestionMessages.retry });
    expect(retry).toHaveAttribute("aria-disabled", "false");

    await user.click(retry);

    expect(await screen.findByText("Tilsett sitron.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onRequest).toHaveBeenCalledTimes(2);
  });

  it("et kall som avvises gir samme melding i stedet for å krasje", async () => {
    const user = userEvent.setup();
    render(
      <SuggestionsSection onRequest={vi.fn().mockRejectedValue(new Error("nettverk borte"))} />,
    );

    await user.click(requestButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(failure.title);
    expect(screen.getByRole("button", { name: suggestionMessages.retry })).toBeInTheDocument();
  });

  it("feilmeldingen forsvinner mens et nytt forsøk pågår", async () => {
    const pending = deferred();
    const onRequest = vi
      .fn<() => Promise<SuggestionsActionResult>>()
      .mockResolvedValueOnce({ ok: false })
      .mockReturnValueOnce(pending.promise);
    const user = userEvent.setup();
    render(<SuggestionsSection onRequest={onRequest} />);

    await user.click(requestButton());
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: suggestionMessages.retry }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
    await act(async () => pending.resolve(success(true)));
  });
});
