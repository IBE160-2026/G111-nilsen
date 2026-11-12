// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import OfflinePage from "./page";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("/frakoblet", () => {
  it("forklarer at man er frakoblet og lar brukeren prøve igjen", () => {
    render(<OfflinePage />);
    expect(screen.getByRole("heading", { level: 1, name: "Du er frakoblet" })).toBeInTheDocument();
    expect(screen.getByText("Ingen nettilkobling akkurat nå.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prøv igjen" })).toBeInTheDocument();
  });

  it("«Prøv igjen» laster siden på nytt", () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
    render(<OfflinePage />);
    fireEvent.click(screen.getByRole("button", { name: "Prøv igjen" }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
