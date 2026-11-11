// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import PrintButton from "./PrintButton";

describe("PrintButton", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("har navnet «Skriv ut <tittel>» og åpner utskriftsdialogen", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<PrintButton title="Pannekaker" />);
    await userEvent.click(screen.getByRole("button", { name: "Skriv ut Pannekaker" }));
    expect(print).toHaveBeenCalledTimes(1);
  });
});
