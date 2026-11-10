// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Step } from "@/domain";
import StepList from "./StepList";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const steps: Step[] = [
  { id: 2, position: 1, section: null, text: "Stek i panne." },
  { id: 1, position: 0, section: null, text: "Finhakk løken" },
  { id: 3, position: 2, section: null, text: "Server varmt." },
];

const box = (name: string) => screen.getByRole("checkbox", { name });

describe("StepList", () => {
  it("viser «Slik gjør du» som nummerert liste sortert på posisjon, alle bokser tomme", () => {
    render(<StepList steps={steps} />);
    const card = screen.getByRole("region", { name: "Slik gjør du" });
    const list = within(card).getByRole("list");
    expect(list.tagName).toBe("OL");
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["1.Finhakk løken", "2.Stek i panne.", "3.Server varmt."]);
    for (const checkbox of within(card).getAllByRole("checkbox")) {
      expect(checkbox).not.toBeChecked();
    }
  });

  it("Steg: klikk på teksten krysser av steget; stegene står i en nummerert liste", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<StepList steps={steps} />);
    await user.click(screen.getByText("Finhakk løken"));
    expect(box("Finhakk løken")).toBeChecked();
    expect(box("Stek i panne.")).not.toBeChecked();
    // Nummeret står igjen, også på det avkryssede steget.
    expect(screen.getByText("1.")).toBeInTheDocument();
    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(3);
    await user.click(screen.getByText("Finhakk løken"));
    expect(box("Finhakk løken")).not.toBeChecked();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("nummeret er et eget element inni labelen: trykk på nummeret veksler steget, og det er ikke med i navnet", async () => {
    const user = userEvent.setup();
    render(<StepList steps={steps} />);
    const number = screen.getByText("2.");
    expect(number).toHaveAttribute("aria-hidden", "true");
    expect(number.closest("label")).toBe(box("Stek i panne.").closest("label"));
    await user.click(number);
    expect(box("Stek i panne.")).toBeChecked();
    expect(box("Finhakk løken")).not.toBeChecked();
  });

  it("tastatur: mellomrom veksler steget og fokus blir stående", async () => {
    const user = userEvent.setup();
    render(<StepList steps={steps} />);
    await user.tab();
    expect(box("Finhakk løken")).toHaveFocus();
    await user.keyboard(" ");
    expect(box("Finhakk løken")).toBeChecked();
    expect(box("Finhakk løken")).toHaveFocus();
  });

  it("viser ingenting uten steg", () => {
    const { container } = render(<StepList steps={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("Lukke og åpne: ingen steg er avkrysset etter at Activity har skjult og vist siden", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Activity mode="visible">
        <StepList steps={steps} />
      </Activity>,
    );
    await user.click(screen.getByText("Server varmt."));
    expect(box("Server varmt.")).toBeChecked();
    rerender(
      <Activity mode="hidden">
        <StepList steps={steps} />
      </Activity>,
    );
    rerender(
      <Activity mode="visible">
        <StepList steps={steps} />
      </Activity>,
    );
    expect(box("Server varmt.")).not.toBeChecked();
  });

  it("Avmontere: ny montering har ingen avkryssede steg", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<StepList steps={steps} />);
    await user.click(screen.getByText("Stek i panne."));
    unmount();
    render(<StepList steps={steps} />);
    expect(box("Stek i panne.")).not.toBeChecked();
  });

  it("merker steg fra forslag og viser forslag til retten under stegene (Story 5.11)", () => {
    render(
      <StepList
        steps={[
          ...steps,
          { id: -4, position: 3, section: null, text: "Smak til.", suggested: true },
        ]}
        tips={["Server med bær."]}
      />,
    );
    expect(box("Smak til. Forslag")).toBeInTheDocument();
    expect(box("Stek i panne.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Forslag til retten" })).toBeInTheDocument();
    expect(screen.getByText("Server med bær.")).toBeInTheDocument();
  });

  it("viser forslag flettet inn i stegteksten, uthevet, og med i navnet på boksen (Story 5.12)", () => {
    render(
      <StepList
        steps={[
          {
            id: 2,
            position: 1,
            section: null,
            text: "Stek i panne.",
            addedBefore: ["La røren hvile."],
            addedAfter: ["Smak til."],
          },
        ]}
      />,
    );
    expect(box("Forslag: La røren hvile. Stek i panne. Forslag: Smak til.")).toBeInTheDocument();
    expect(document.querySelectorAll("mark")).toHaveLength(2);
  });

  it("viser kortet med bare forslag til retten, uten steg", () => {
    render(<StepList steps={[]} tips={["Server med bær."]} />);
    expect(screen.getByRole("region", { name: "Slik gjør du" })).toBeInTheDocument();
  });
});
