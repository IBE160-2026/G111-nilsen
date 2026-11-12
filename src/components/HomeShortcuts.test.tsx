// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import HomeShortcuts from "./HomeShortcuts";

const shortcuts = [
  { href: "/statistikk", title: "Statistikk" },
  { href: "/delt", title: "Deling" },
];

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("HomeShortcuts", () => {
  it("viser alle snarveiene som standard", () => {
    render(<HomeShortcuts shortcuts={shortcuts} />);
    expect(screen.getByRole("link", { name: "Statistikk" })).toHaveAttribute("href", "/statistikk");
    expect(screen.getByRole("link", { name: "Deling" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tilpass" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("lar deg skjule og vise en snarvei, og husker valget", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<HomeShortcuts shortcuts={shortcuts} />);
    await user.click(screen.getByRole("button", { name: "Tilpass" }));
    await user.click(screen.getByRole("checkbox", { name: "Deling" }));
    expect(screen.queryByRole("link", { name: "Deling" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Statistikk" })).toBeInTheDocument();
    expect(window.localStorage.getItem("recipemate-hidden-shortcuts")).toBe('["/delt"]');

    unmount();
    render(<HomeShortcuts shortcuts={shortcuts} />);
    expect(screen.queryByRole("link", { name: "Deling" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tilpass" }));
    expect(screen.getByRole("checkbox", { name: "Deling" })).not.toBeChecked();
    await user.click(screen.getByRole("checkbox", { name: "Deling" }));
    expect(screen.getByRole("link", { name: "Deling" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ferdig" }));
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("forklarer når alle er skjult", async () => {
    window.localStorage.setItem("recipemate-hidden-shortcuts", '["/statistikk","/delt"]');
    render(<HomeShortcuts shortcuts={shortcuts} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText(/Ingen snarveier valgt/)).toBeInTheDocument();
  });
});
