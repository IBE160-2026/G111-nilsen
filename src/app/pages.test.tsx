// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import HomePage from "./page";
import NotFound from "./not-found";

afterEach(cleanup);

describe("forsiden og 404-siden", () => {
  it("forsiden har overskriften «RecipeMate» og en kort forklaring", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1, name: "RecipeMate" })).toBeInTheDocument();
    expect(screen.getByText(/Hent oppskrifter fra nettet/)).toBeInTheDocument();
  });

  it("forsiden har snarveier til alle delene, med «Hent en oppskrift» først", () => {
    render(<HomePage />);
    const links = within(screen.getByRole("region", { name: "Kom i gang" })).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/importer",
      "/oppskrifter",
      "/ukemeny",
      "/handleliste",
      "/mapper",
      "/favoritter",
    ]);
    expect(links[0]).toHaveTextContent("Hent en oppskrift");
  });

  it("forsiden har ikke selv importskjemaet (det ligger på /importer)", () => {
    render(<HomePage />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("404-siden er på norsk og lenker til forsiden", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1, name: "Fant ikke siden" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gå til forsiden" })).toHaveAttribute("href", "/");
  });
});
