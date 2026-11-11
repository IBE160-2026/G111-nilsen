// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ImportBackupForm from "./ImportBackupForm";

afterEach(cleanup);

describe("ImportBackupForm", () => {
  it("sender skjemaet og viser suksessmeldingen med lenke til Oppskrifter", async () => {
    const action = vi.fn(async () => ({
      status: "ok" as const,
      message: "2 oppskrifter ble lagt til.",
    }));
    render(<ImportBackupForm action={action} />);
    fireEvent.click(screen.getByRole("button", { name: "Importer oppskriftene" }));
    expect(await screen.findByText(/2 oppskrifter ble lagt til/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Åpne Oppskrifter" })).toHaveAttribute(
      "href",
      "/oppskrifter",
    );
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("viser feilmeldingen som varsel og knytter den til feltet", async () => {
    const action = vi.fn(async () => ({ status: "error" as const, message: "Velg en fil først." }));
    render(<ImportBackupForm action={action} />);
    fireEvent.click(screen.getByRole("button", { name: "Importer oppskriftene" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Velg en fil først.");
    expect(screen.getByLabelText("Fil med oppskrifter")).toHaveAttribute("aria-invalid", "true");
  });
});
