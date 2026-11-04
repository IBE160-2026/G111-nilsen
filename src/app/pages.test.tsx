// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ImporterPage from "./page";
import NotFound from "./not-found";
import SamlingenPage from "./samlingen/page";
import MapperPage from "./mapper/page";
import FavoritterPage from "./favoritter/page";

afterEach(cleanup);

describe("sider (spec 1.1, matrise: Start og Ukjent side)", () => {
  it("Importer-siden viser overskriften «Hent en oppskrift»", () => {
    render(<ImporterPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Hent en oppskrift" }),
    ).toBeInTheDocument();
  });

  it.each([
    ["Samlingen", SamlingenPage],
    ["Mapper", MapperPage],
    ["Favoritter", FavoritterPage],
  ])("%s viser en tom-tilstand med forklarende tekst", (_navn, Page) => {
    render(<Page />);
    expect(screen.getAllByRole("heading").length).toBeGreaterThanOrEqual(2);
  });

  it("404-siden er på norsk og lenker til Importer", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1, name: "Fant ikke siden" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gå til Importer" })).toHaveAttribute("href", "/");
  });
});
