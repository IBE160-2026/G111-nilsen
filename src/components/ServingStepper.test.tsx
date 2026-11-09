// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { servingStepperMessages } from "@/lib/messages";
import ServingStepper, { parseServings, servingsText } from "./ServingStepper";

afterEach(cleanup);

function Harness({ start, original, spy }: { start: number; original: number; spy?: () => void }) {
  const [value, setValue] = useState(start);
  return (
    <ServingStepper
      value={value}
      original={original}
      onChange={(next) => {
        spy?.();
        setValue(next);
      }}
    />
  );
}

const field = () => screen.getByLabelText("Antall personer");
const minus = () => screen.getByRole("button", { name: "Færre personer" });
const plus = () => screen.getByRole("button", { name: "Flere personer" });

describe("ServingStepper", () => {
  it("viser etikett, antall, «oppr. N» og ingen tilbakestilling ved opprinnelig antall", () => {
    render(<Harness start={4} original={4} />);
    expect(field()).toHaveValue("4");
    expect(screen.getByText("oppr. 4")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Tilbakestill/ })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("4 personer");
  });

  it("+ øker med 1 og annonserer nytt antall", async () => {
    const user = userEvent.setup();
    render(<Harness start={4} original={4} />);
    await user.click(plus());
    expect(field()).toHaveValue("5");
    expect(screen.getByRole("status")).toHaveTextContent("5 personer");
    expect(screen.getByRole("button", { name: "Tilbakestill til 4" })).toBeInTheDocument();
  });

  it("− er aria-disabled ved 1, + ved 50, uten disabled", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Harness start={2} original={4} />);
    await user.click(minus());
    expect(field()).toHaveValue("1");
    expect(minus()).toHaveAttribute("aria-disabled", "true");
    expect(minus()).not.toBeDisabled();
    expect(plus()).not.toHaveAttribute("aria-disabled");
    expect(screen.getByRole("status")).toHaveTextContent("1 person");
    unmount();

    render(<Harness start={50} original={4} />);
    expect(plus()).toHaveAttribute("aria-disabled", "true");
    expect(plus()).not.toBeDisabled();
    expect(minus()).not.toHaveAttribute("aria-disabled");
  });

  it("Grense 1: fokus blir på − etter klikk og Enter/mellomrom, og antallet er uendret", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness start={2} original={4} spy={spy} />);
    await user.click(minus());
    expect(spy).toHaveBeenCalledTimes(1);

    minus().focus();
    expect(minus()).toHaveFocus();
    await user.click(minus());
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(minus()).toHaveFocus();
    expect(field()).toHaveValue("1");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(minus()).toHaveAttribute("aria-disabled", "true");
  });

  it("Grense 50: klikk på + gjør ingenting og fokus blir på +", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness start={49} original={4} spy={spy} />);
    await user.click(plus());
    expect(field()).toHaveValue("50");
    await user.click(plus());
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(plus()).toHaveFocus();
    expect(field()).toHaveValue("50");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("klikk ved grensen rører ikke en feilmelding som vises", async () => {
    const user = userEvent.setup();
    render(<Harness start={1} original={4} />);
    await user.clear(field());
    await user.type(field(), "abc{Enter}");
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await user.click(minus());
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("annonserer ikke mens brukeren skriver, bare når verdien tas i bruk", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness start={4} original={4} spy={spy} />);
    await user.clear(field());
    await user.type(field(), "12");
    expect(screen.getByRole("status")).toHaveTextContent("4 personer");
    expect(spy).not.toHaveBeenCalled();
    await user.keyboard("{Enter}");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("12 personer");
  });

  it.each(["0", "51", "2,5", "", "abc"])(
    "ugyldig «%s» gir melding og beholder forrige verdi",
    async (text) => {
      const user = userEvent.setup();
      const spy = vi.fn();
      render(<Harness start={6} original={4} spy={spy} />);
      await user.clear(field());
      if (text) await user.type(field(), text);
      await user.tab();

      expect(spy).not.toHaveBeenCalled();
      expect(field()).toHaveValue("6");
      expect(field()).toHaveAttribute("aria-invalid", "true");
      expect(field()).toHaveAccessibleDescription(servingStepperMessages.invalid);
    },
  );

  it("en gyldig verdi etter en feil fjerner meldingen", async () => {
    const user = userEvent.setup();
    render(<Harness start={4} original={4} />);
    await user.clear(field());
    await user.type(field(), "abc{Enter}");
    expect(screen.getByText(servingStepperMessages.invalid)).toBeInTheDocument();
    await user.clear(field());
    await user.type(field(), "3{Enter}");
    expect(screen.queryByText(servingStepperMessages.invalid)).not.toBeInTheDocument();
    expect(field()).not.toHaveAttribute("aria-invalid");
    expect(field()).toHaveValue("3");
  });

  it("tilbakestilling setter opprinnelig antall og skjuler knappen", async () => {
    const user = userEvent.setup();
    render(<Harness start={8} original={4} />);
    await user.click(screen.getByRole("button", { name: "Tilbakestill til 4" }));
    expect(field()).toHaveValue("4");
    expect(screen.queryByRole("button", { name: /Tilbakestill/ })).not.toBeInTheDocument();
  });

  it.each([
    ["1", 1],
    [" 50 ", 50],
    ["07", 7],
    ["0", null],
    ["51", null],
    ["2,5", null],
    ["2.5", null],
    ["-3", null],
    ["", null],
    ["abc", null],
  ])("parseServings(%j) = %s", (text, expected) => {
    expect(parseServings(text)).toBe(expected);
  });

  it("servingsText bruker entall for 1", () => {
    expect(servingsText(1)).toBe("1 person");
    expect(servingsText(2)).toBe("2 personer");
  });

  it("feilmeldingen er en live-region som leses opp etter at fokus har forlatt feltet", async () => {
    const user = userEvent.setup();
    render(<Harness start={4} original={4} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.clear(field());
    await user.type(field(), "0");
    await user.tab();
    expect(screen.getByRole("alert")).toHaveTextContent(servingStepperMessages.invalid);
  });
});
