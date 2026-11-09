// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({ submitImport: vi.fn() }));
import ImporterPage from "./page";
import NotFound from "./not-found";

afterEach(cleanup);

describe("sider (spec 1.1, matrise: Start og Ukjent side; Samlingen, Mapper og Favoritter testes i samlingen/page.test.tsx, mapper/page.test.tsx og favoritter/page.test.tsx)", () => {
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

  it("Importer-siden har lenkefelt med etikett, fokus og knappen «Hent oppskrift» (ikke lenger «Snart …»)", () => {
    render(<ImporterPage />);
    const field = screen.getByRole("textbox", { name: "Lenke til oppskriften" });
    expect(field).toHaveFocus();
    expect(screen.getByRole("button", { name: "Hent oppskrift" })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("Snart");
  });

  it("404-siden er på norsk og lenker til Importer", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1, name: "Fant ikke siden" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gå til Importer" })).toHaveAttribute("href", "/");
  });
});
