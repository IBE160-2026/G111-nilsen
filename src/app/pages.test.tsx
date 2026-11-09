// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ImporterPage from "./page";
import NotFound from "./not-found";
import FavoritterPage from "./favoritter/page";

afterEach(cleanup);

describe("sider (spec 1.1, matrise: Start og Ukjent side; Samlingen og Mapper testes i samlingen/page.test.tsx og mapper/page.test.tsx)", () => {
  it("Importer-siden viser overskriften «Hent en oppskrift»", () => {
    render(<ImporterPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Hent en oppskrift" }),
    ).toBeInTheDocument();
  });

  it("Importer-siden lenker til «Legg inn selv» (/ny)", () => {
    render(<ImporterPage />);
    expect(screen.getByRole("link", { name: "Legg inn selv" })).toHaveAttribute("href", "/ny");
  });

  it.each([
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
