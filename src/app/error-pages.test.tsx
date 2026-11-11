// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fallbackMessage, messageFor } from "@/lib/messages";
import ErrorPage from "./error";
import RecipeNotFound from "./oppskrift/[id]/not-found";

afterEach(cleanup);

describe("feilsider", () => {
  it("oppskriftens 404-side viser not_found-meldingen og lenker til Importer", () => {
    render(<RecipeNotFound />);
    const message = messageFor("not_found");
    expect(
      screen.getByRole("heading", { level: 1, name: "Fant ikke oppskriften" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: message.title })).toBeInTheDocument();
    expect(screen.getByText(message.body)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gå til forsiden" })).toHaveAttribute("href", "/");
  });

  it("feilsiden viser norsk reservemelding og kan prøve igjen", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const retry = vi.fn();
    render(<ErrorPage error={new Error("databasen er låst")} retry={retry} />);

    expect(screen.getByRole("heading", { level: 1, name: "Noe gikk galt" })).toBeInTheDocument();
    expect(screen.getByText(fallbackMessage.body)).toBeInTheDocument();
    expect(screen.queryByText(/databasen er låst/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gå til forsiden" })).toHaveAttribute("href", "/");

    await userEvent.setup().click(screen.getByRole("button", { name: "Prøv igjen" }));
    expect(retry).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });
});
