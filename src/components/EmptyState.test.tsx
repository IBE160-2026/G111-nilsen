// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import EmptyState from "./EmptyState";

afterEach(cleanup);

describe("EmptyState", () => {
  it("viser tittel, forklaring og én knapp", () => {
    render(
      <EmptyState title="Tittel" description="Forklaring" action={{ href: "/a", label: "Gå" }} />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Tittel" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gå" })).toHaveAttribute("href", "/a");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("viser hovedknapp før sekundærknapp", () => {
    render(
      <EmptyState
        title="Tittel"
        description="Forklaring"
        action={{ href: "/a", label: "Først" }}
        secondaryAction={{ href: "/b", label: "Så" }}
      />,
    );
    expect(screen.getAllByRole("link").map((a) => [a.textContent, a.getAttribute("href")])).toEqual(
      [
        ["Først", "/a"],
        ["Så", "/b"],
      ],
    );
  });

  it("viser ingen knapper uten handlinger", () => {
    render(<EmptyState title="Tittel" description="Forklaring" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
