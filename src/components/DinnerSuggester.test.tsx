// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import DinnerSuggester from "./DinnerSuggester";

afterEach(cleanup);

const recipes = [
  { id: 1, title: "Suppe", totalMinutes: 20, isFavorite: true },
  { id: 2, title: "Lasagne", totalMinutes: 90, isFavorite: false },
];

describe("DinnerSuggester", () => {
  it("viser antall og ingen forslag før man trykker", () => {
    render(<DinnerSuggester recipes={recipes} />);
    expect(screen.getByText("2 oppskrifter å velge blant")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Forslag" })).toBeNull();
  });

  it("foreslår en oppskrift med lenke, og «en annen» er alltid en annen", () => {
    render(<DinnerSuggester recipes={recipes} />);
    fireEvent.click(screen.getByRole("button", { name: "Foreslå en middag" }));
    const first = screen.getByRole("region", { name: "Forslag" });
    let previous = first.querySelector("h2")!.textContent;
    expect(screen.getByRole("link", { name: "Åpne oppskriften" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/oppskrift\/[12]$/),
    );
    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByRole("button", { name: "Foreslå en annen" }));
      const next = screen.getByRole("region", { name: "Forslag" }).querySelector("h2")!.textContent;
      expect(next).not.toBe(previous);
      previous = next;
    }
  });

  it("filtrerer på favoritter og tid", () => {
    render(<DinnerSuggester recipes={recipes} />);
    fireEvent.click(screen.getByLabelText("Bare favoritter"));
    expect(screen.getByText("1 oppskrift å velge blant")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Foreslå en middag" }));
    expect(screen.getByRole("heading", { level: 2, name: "Suppe" })).toBeInTheDocument();
    expect(screen.getByText("Dette er den eneste oppskriften som passer.")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Opptil 30 min"));
    expect(screen.getByRole("heading", { level: 2, name: "Suppe" })).toBeInTheDocument();
  });

  it("tidsvalgene er en radiogruppe med «Alle» som start", () => {
    render(<DinnerSuggester recipes={recipes} />);
    expect(screen.getByRole("radio", { name: "Alle" })).toBeChecked();
    fireEvent.click(screen.getByLabelText("Opptil 60 min"));
    expect(screen.getByRole("radio", { name: "Opptil 60 min" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Alle" })).not.toBeChecked();
    // Lasagne tar 90 min og faller ut; bare Suppe er igjen.
    expect(screen.getByText("1 oppskrift å velge blant")).toBeInTheDocument();
  });

  it("viser et ventekort før man har trykket, og tid, mappe og merkelapper etterpå", () => {
    render(
      <DinnerSuggester
        recipes={[
          {
            id: 1,
            title: "Suppe",
            totalMinutes: 20,
            isFavorite: true,
            folderName: "Hverdag",
            rating: 4,
            labels: ["Rask", "Vegetar"],
          },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Middagen venter" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Foreslå en middag" }));
    const kort = screen.getByRole("region", { name: "Forslag" });
    expect(kort).toHaveTextContent("20 min");
    expect(kort).toHaveTextContent("Hverdag");
    expect(within(kort).getByRole("img", { name: /4 av 5/ })).toBeInTheDocument();
    expect(within(kort).getByText("Rask")).toBeInTheDocument();
  });

  it("fjerner forslaget og knappen når filteret ikke passer", () => {
    render(<DinnerSuggester recipes={[recipes[1]!]} />);
    fireEvent.click(screen.getByRole("button", { name: "Foreslå en middag" }));
    expect(screen.getByRole("region", { name: "Forslag" })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Bare favoritter"));
    expect(screen.queryByRole("region", { name: "Forslag" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Ingen oppskrifter passer" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Foreslå/ })).toBeNull();
  });
});
