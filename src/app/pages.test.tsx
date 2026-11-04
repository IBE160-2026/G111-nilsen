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
    [
      "Samlingen",
      SamlingenPage,
      "Du har ingen lagrede oppskrifter ennå.",
      "Importer din første oppskrift",
      "/",
    ],
    ["Mapper", MapperPage, "Du har ingen mapper ennå.", "Gå til samlingen", "/samlingen"],
    [
      "Favoritter",
      FavoritterPage,
      "Du har ingen favoritter ennå.",
      "Gå til samlingen",
      "/samlingen",
    ],
  ])("%s viser riktig tom-tilstand", (navn, Page, tittel, lenketekst, href) => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: navn })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: tittel })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: lenketekst })).toHaveAttribute("href", href);
  });

  it("404-siden er på norsk og lenker til Importer", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1, name: "Fant ikke siden" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gå til Importer" })).toHaveAttribute("href", "/");
  });
});
