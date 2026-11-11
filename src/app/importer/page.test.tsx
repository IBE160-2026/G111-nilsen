// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../actions", () => ({ submitImport: vi.fn() }));
import ImporterPage from "./page";

afterEach(cleanup);

describe("/importer (spec 1.1, Importer-siden)", () => {
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
});
