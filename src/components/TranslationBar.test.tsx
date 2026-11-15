// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import TranslationBar from "./TranslationBar";

afterEach(cleanup);

describe("TranslationBar", () => {
  it("uten oversettelse: «Oversett til norsk» kaller handlingen og viser en feilmelding", async () => {
    const user = userEvent.setup();
    const onTranslate = vi
      .fn()
      .mockResolvedValue({ ok: false, message: "Oversettelse er ikke slått på." });
    render(
      <TranslationBar
        hasTranslation={false}
        norwegian={false}
        onTranslate={onTranslate}
        onShow={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Oversett til norsk" }));
    expect(onTranslate).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Oversettelse er ikke slått på.")).toBeInTheDocument();
  });

  it("med oversettelse: Original og Norsk bytter visning, og valgt er trykket inn", async () => {
    const user = userEvent.setup();
    const onShow = vi.fn().mockResolvedValue({ ok: true });
    render(<TranslationBar hasTranslation norwegian onTranslate={vi.fn()} onShow={onShow} />);
    expect(screen.getByRole("button", { name: "Norsk" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Original" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.queryByRole("button", { name: "Oversett til norsk" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Original" }));
    expect(onShow).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("avviste kall gir en reservemelding", async () => {
    const user = userEvent.setup();
    render(
      <TranslationBar
        hasTranslation={false}
        norwegian={false}
        onTranslate={vi.fn().mockRejectedValue(new Error("nede"))}
        onShow={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Oversett til norsk" }));
    expect(await screen.findByText(/Noe gikk galt/)).toBeInTheDocument();
  });
});
