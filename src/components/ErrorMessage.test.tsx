// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import ErrorMessage from "./ErrorMessage";

afterEach(cleanup);

describe("ErrorMessage", () => {
  it("er et varsel (role=alert) med tittel og forklaring", () => {
    render(<ErrorMessage id="feil" title="Tittel." body="Forklaring." />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("id", "feil");
    expect(alert).toHaveTextContent("Tittel.");
    expect(alert).toHaveTextContent("Forklaring.");
  });

  it("viser veien videre som barn", () => {
    render(
      <ErrorMessage title="T" body="B">
        <a href="/ny">Legg inn selv</a>
      </ErrorMessage>,
    );
    expect(screen.getByRole("alert")).toContainElement(
      screen.getByRole("link", { name: "Legg inn selv" }),
    );
  });

  it("uten barn finnes ingen handlingsrad", () => {
    const { container } = render(<ErrorMessage title="T" body="B" />);
    expect(container.querySelectorAll("a, button")).toHaveLength(0);
  });
});

describe("ErrorMessage.module.css", () => {
  const css = readFileSync(join(process.cwd(), "src/components/ErrorMessage.module.css"), "utf8");

  it("har 4 px venstrekant i aksentfarge og bruker bare tokens", () => {
    expect(css).toMatch(/border-left:\s*4px solid var\(--color-accent\)/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\brgba?\(|\bhsla?\(/);
  });

  it("støtter forced-colors og bryter lange lenker", () => {
    expect(css).toContain("forced-colors: active");
    expect(css).toContain("overflow-wrap: anywhere");
  });
});
