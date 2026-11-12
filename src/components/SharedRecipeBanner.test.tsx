// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import SharedRecipeBanner from "./SharedRecipeBanner";

afterEach(cleanup);

describe("SharedRecipeBanner", () => {
  it("sier hvem oppskriften er delt av, og kopierer til egen samling", async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn(async () => ({ ok: true as const, id: 7 }));
    render(<SharedRecipeBanner email="per@eksempel.no" onCopy={onCopy} />);
    expect(screen.getByText(/Delt av per@eksempel.no/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Kopier til min samling" }));
    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText("Oppskriften er kopiert til samlingen din."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Se oppskriftene" })).toHaveAttribute(
      "href",
      "/oppskrift/7",
    );
  });

  it("viser meldingen når kopieringen feiler, og lar deg prøve igjen", async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn(async () => ({ ok: false as const, message: "Fant ikke oppskriften." }));
    render(<SharedRecipeBanner email="per@eksempel.no" onCopy={onCopy} />);
    await user.click(screen.getByRole("button", { name: "Kopier til min samling" }));
    expect(await screen.findByText("Fant ikke oppskriften.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kopier til min samling" })).toBeInTheDocument();
  });

  it("tåler at handlingen kaster", async () => {
    const user = userEvent.setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <SharedRecipeBanner
        email="per@eksempel.no"
        onCopy={async () => {
          throw new Error("nei");
        }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Kopier til min samling" }));
    expect(await screen.findByText("Kunne ikke kopiere oppskriften.")).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
